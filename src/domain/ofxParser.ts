import type { StatementTransaction } from "./types";

export function isOFX(content: string): boolean {
  return content.includes("OFXHEADER") || content.includes("<OFX>");
}

export function parseOFX(content: string): StatementTransaction[] {
  const transactions: StatementTransaction[] = [];
  try {
    let clean = content;
    const idx = clean.indexOf("<OFX>");
    if (idx !== -1) clean = clean.substring(idx);
    clean = clean.replace(/<([A-Z0-9]+)>([^<]+)/g,"<$1>$2</$1>");
    const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
      const trn = match[1];
      const dateMatch = trn.match(/<DTPOSTED>(\d{8})/);
      const amountMatch = trn.match(/<TRNAMT>([-\d.]+)/);
      const memoMatch = trn.match(/<MEMO>([^<]+)/);
      const nameMatch = trn.match(/<NAME>([^<]+)/);
      if (!dateMatch || !amountMatch) continue;
      const ds = dateMatch[1];
      const date = `${ds.substring(0,4)}-${ds.substring(4,6)}-${ds.substring(6,8)}`;
      const amount = parseFloat(amountMatch[1]);
      transactions.push({
        date, description: (memoMatch?.[1] || nameMatch?.[1] || "Transacao").trim(),
        amountCents: Math.round(Math.abs(amount) * 100),
        kind: amount < 0 ? "expense" : "income",
      });
    }
    return transactions;
  } catch (err) {
    throw new Error("Arquivo OFX invalido ou formato nao suportado");
  }
}

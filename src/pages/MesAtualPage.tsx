                  </div>
                )}
                <button onClick={() => setShowImport(false)} style={{ width: "100%", padding: "10px", background: "var(--border)", border: "none", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 13 }}>Fechar</button>
              </>
            )}

            {importedRows.length > 0 && (
              <>
                <div style={{ fontSize: 13, color: "var(--success)", marginBottom: 12 }}>
                  ✅ {importedRows.length} transações encontradas — revise e edite antes de salvar:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {importedRows.map((t) => (
                    <div key={t._id} style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input value={t._label} onChange={e => updateRow(t._id, "_label", e.target.value)} style={{ ...inputStyle, flex: 2 }} placeholder="Descrição" />
                        <input value={t._amount} onChange={e => updateRow(t._id, "_amount", e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Valor" />
                        <button onClick={() => removeRow(t._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 16, padding: "0 4px" }}>🗑️</button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select value={t._kind} onChange={e => updateRow(t._id, "_kind", e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                          <option value="expense">💸 Despesa</option>
                          <option value="income">💰 Receita</option>
                        </select>
                        <select value={t._category} onChange={e => updateRow(t._id, "_category", e.target.value)} style={{ ...inputStyle, flex: 2 }}>
                          <option value="">Sem categoria</option>
                          {MAIN_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setImportedRows([])} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 13 }}>← Voltar</button>
                  <button onClick={handleSaveImported} style={{ flex: 2, padding: "10px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600 }}>Salvar {importedRows.length} transações</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 24, width: "90%", maxWidth: 440, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>+ {tab === "expenses" ? "Despesa" : "Receita"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Descrição", formLabel, setFormLabel, "text"],["Valor (R$)", formAmount, setFormAmount, "number"]].map(([l,v,set,t]) => (
                <div key={l as string}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{l as string}</label>
                  <input type={t as string} value={v as string} onChange={e => (set as any)(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
              ))}
              {tab === "expenses" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Categoria</label>
                  <select value={formCat} onChange={e => setFormCat(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }}>
                    <option value="">Sem categoria</option>
                    {MAIN_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 13 }}>Cancelar</button>
                <button onClick={handleAdd} style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600 }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

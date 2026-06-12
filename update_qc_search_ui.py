import os

path = 'src/app/pages/EngineeringQCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

history_ui_old = """          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat QC</span>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input 
                  type="text" 
                  placeholder="Cari SO atau Deskripsi..." 
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setCurrentPageHistory(1); }}
                  style={{ padding: "6px 10px 6px 30px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "12px", outline: "none", width: 200, fontFamily: S.font }} 
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
                <button onClick={() => { setHistoryFilter('All'); setCurrentPageHistory(1); }} style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: "none", background: historyFilter === 'All' ? S.cyan : S.white, color: historyFilter === 'All' ? "#fff" : S.secondary, fontFamily: S.font }}>Semua</button>
                <button onClick={() => { setHistoryFilter('Pass'); setCurrentPageHistory(1); }} style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: "none", borderLeft: `1px solid ${S.border}`, background: historyFilter === 'Pass' ? "#22C55E" : S.white, color: historyFilter === 'Pass' ? "#fff" : S.secondary, fontFamily: S.font }}>Go</button>
                <button onClick={() => { setHistoryFilter('Fail'); setCurrentPageHistory(1); }} style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: "none", borderLeft: `1px solid ${S.border}`, background: historyFilter === 'Fail' ? "#EF4444" : S.white, color: historyFilter === 'Fail' ? "#fff" : S.secondary, fontFamily: S.font }}>NoGo</button>
              </div>
            </div>
          </div>"""

pass_count = "recentCompleted.filter(s => s.qcStatus === 'Pass').length"
fail_count = "recentCompleted.filter(s => s.qcStatus === 'Fail').length"

history_ui_new = """          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat QC</span>
          </div>

          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
              <input 
                type="text" 
                placeholder="Cari SO atau Deskripsi..." 
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setCurrentPageHistory(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} 
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: 'All', label: 'Semua' },
                { value: 'Pass', label: `Go (${"""+pass_count+"""})` },
                { value: 'Fail', label: `NoGo (${"""+fail_count+"""})` },
              ].map(f => (
                <button 
                  key={f.value} 
                  onClick={() => { setHistoryFilter(f.value); setCurrentPageHistory(1); }}
                  style={{ 
                    padding: "6px 16px", borderRadius: 6, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", border: "none", 
                    background: historyFilter === f.value ? S.slate : S.white, 
                    color: historyFilter === f.value ? "#fff" : S.secondary, 
                    boxShadow: historyFilter === f.value ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    border: historyFilter === f.value ? `1px solid ${S.slate}` : `1px solid ${S.border}`
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>"""

content = content.replace(history_ui_old, history_ui_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("QC Search UI updated successfully.")

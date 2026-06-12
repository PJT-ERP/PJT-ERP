import os

path = 'src/app/pages/EngineeringQCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update itemsPerPage to 10
content = content.replace("const itemsPerPage = 5;", "const itemsPerPage = 10;")

queue_pagination_code = """
        {qcQueue.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPageQueue - 1) * itemsPerPage + 1}–{Math.min(currentPageQueue * itemsPerPage, qcQueue.length)} dari {qcQueue.length} hasil
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setCurrentPageQueue(p => Math.max(1, p - 1))} disabled={currentPageQueue === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQueue === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageQueue === 1 ? "not-allowed" : "pointer" }}>
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.ceil(qcQueue.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPageQueue(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPageQueue ? S.cyan : "transparent", color: p === currentPageQueue ? "#FFFFFF" : "#475569", fontSize: "13.5px", fontWeight: p === currentPageQueue ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setCurrentPageQueue(p => Math.min(Math.ceil(qcQueue.length / itemsPerPage), p + 1))} disabled={currentPageQueue >= Math.ceil(qcQueue.length / itemsPerPage)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQueue >= Math.ceil(qcQueue.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageQueue >= Math.ceil(qcQueue.length / itemsPerPage) ? "not-allowed" : "pointer" }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}"""

content = content.replace("      </div>\n\n      {/* History */}", queue_pagination_code)

history_pagination_code = """
          {recentCompleted.length > itemsPerPage && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
              <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                {(currentPageHistory - 1) * itemsPerPage + 1}–{Math.min(currentPageHistory * itemsPerPage, recentCompleted.length)} dari {recentCompleted.length} hasil
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => setCurrentPageHistory(p => Math.max(1, p - 1))} disabled={currentPageHistory === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageHistory === 1 ? "not-allowed" : "pointer" }}>
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.ceil(recentCompleted.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setCurrentPageHistory(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPageHistory ? S.cyan : "transparent", color: p === currentPageHistory ? "#FFFFFF" : "#475569", fontSize: "13.5px", fontWeight: p === currentPageHistory ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPageHistory(p => Math.min(Math.ceil(recentCompleted.length / itemsPerPage), p + 1))} disabled={currentPageHistory >= Math.ceil(recentCompleted.length / itemsPerPage)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory >= Math.ceil(recentCompleted.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageHistory >= Math.ceil(recentCompleted.length / itemsPerPage) ? "not-allowed" : "pointer" }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}"""

content = content.replace("        </div>\n      )}\n    </div>\n  );\n}", history_pagination_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Pagination injected successfully.")

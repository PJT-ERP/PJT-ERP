import re

with open(r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\EngineeringQCPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'ChevronLeft' not in content:
    content = content.replace('Image as ImageIcon } from "lucide-react";', 'Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";')

state_vars = '''  const [currentPageQueue, setCurrentPageQueue] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const itemsPerPage = 5;
'''
if 'currentPageQueue' not in content:
    content = content.replace('  const [historyDetail, setHistoryDetail] = useState<SalesOrder | null>(null);',
                              '  const [historyDetail, setHistoryDetail] = useState<SalesOrder | null>(null);\n' + state_vars)

content = content.replace("salesOrders.filter(so => so.status === 'Completed').slice(0, 8);", 
                          "salesOrders.filter(so => so.status === 'Completed');")

content = content.replace('qcQueue.map((so, idx) => {',
                          'qcQueue.slice((currentPageQueue - 1) * itemsPerPage, currentPageQueue * itemsPerPage).map((so, idx) => {')

queue_pagination = '''
          </div>
        )}
        
        {qcQueue.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPageQueue - 1) * itemsPerPage + 1}–{Math.min(currentPageQueue * itemsPerPage, qcQueue.length)} dari {qcQueue.length} hasil
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                onClick={() => setCurrentPageQueue(p => Math.max(1, p - 1))}
                disabled={currentPageQueue === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQueue === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageQueue === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.ceil(qcQueue.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPageQueue(p)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none",
                    background: p === currentPageQueue ? S.cyan : "transparent",
                    color: p === currentPageQueue ? "#FFFFFF" : "#475569",
                    fontSize: "13.5px", fontWeight: p === currentPageQueue ? 600 : 500,
                    cursor: "pointer", transition: "all 0.1s"
                  }}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPageQueue(p => Math.min(Math.ceil(qcQueue.length / itemsPerPage), p + 1))}
                disabled={currentPageQueue >= Math.ceil(qcQueue.length / itemsPerPage)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQueue >= Math.ceil(qcQueue.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageQueue >= Math.ceil(qcQueue.length / itemsPerPage) ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
'''
if 'currentPageQueue' not in content.split('qcQueue.length > itemsPerPage')[0]:
    content = content.replace('          </div>\n        )}\n      </div>', queue_pagination)

content = content.replace('recentCompleted.map((so, idx) => (',
                          'recentCompleted.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).map((so, idx) => (')

history_pagination = '''
          </div>
          
          {recentCompleted.length > itemsPerPage && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF", borderRadius: "0 0 6px 6px" }}>
              <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                {(currentPageHistory - 1) * itemsPerPage + 1}–{Math.min(currentPageHistory * itemsPerPage, recentCompleted.length)} dari {recentCompleted.length} hasil
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button 
                  onClick={() => setCurrentPageHistory(p => Math.max(1, p - 1))}
                  disabled={currentPageHistory === 1}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageHistory === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.ceil(recentCompleted.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPageHistory(p)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none",
                      background: p === currentPageHistory ? S.cyan : "transparent",
                      color: p === currentPageHistory ? "#FFFFFF" : "#475569",
                      fontSize: "13.5px", fontWeight: p === currentPageHistory ? 600 : 500,
                      cursor: "pointer", transition: "all 0.1s"
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPageHistory(p => Math.min(Math.ceil(recentCompleted.length / itemsPerPage), p + 1))}
                  disabled={currentPageHistory >= Math.ceil(recentCompleted.length / itemsPerPage)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory >= Math.ceil(recentCompleted.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageHistory >= Math.ceil(recentCompleted.length / itemsPerPage) ? "not-allowed" : "pointer" }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
'''
if 'currentPageHistory' not in content.split('recentCompleted.length > itemsPerPage')[0]:
    content = content.replace('          </div>\n        </div>', history_pagination)

with open(r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\EngineeringQCPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done splicing pagination.')

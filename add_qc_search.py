import os

path = 'src/app/pages/EngineeringQCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Search icon
content = content.replace(
    'import { Upload, X, CheckCircle, Shield, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";',
    'import { Upload, X, CheckCircle, Shield, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";'
)

# Add state
state_replace = """  const [currentPageQueue, setCurrentPageQueue] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const itemsPerPage = 10;"""
content = content.replace("""  const [currentPageQueue, setCurrentPageQueue] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const itemsPerPage = 10;""", state_replace)

# Replace recentCompleted map to filteredHistory map
filter_logic = """  const recentCompleted = salesOrders.filter(so => so.status === 'completed');
  
  const filteredHistory = recentCompleted.filter(so => {
    const matchesSearch = so.id.toLowerCase().includes(historySearch.toLowerCase()) || 
                          so.description.toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter = historyFilter === 'All' || 
                          (historyFilter === 'Pass' && so.qcStatus === 'Pass') || 
                          (historyFilter === 'Fail' && so.qcStatus === 'Fail');
    return matchesSearch && matchesFilter;
  });"""
content = content.replace("  const recentCompleted = salesOrders.filter(so => so.status === 'completed');", filter_logic)

history_ui_old = """      {/* History */}
      {recentCompleted.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat QC</span>
          </div>"""

history_ui_new = """      {/* History */}
      {recentCompleted.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
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

content = content.replace(history_ui_old, history_ui_new)

# Update map and pagination logic
content = content.replace("{recentCompleted.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).map((so, idx) => (", "{filteredHistory.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).map((so, idx) => (")
content = content.replace("borderBottom: idx < recentCompleted.length - 1 ? `1px solid ${S.border}` : \"none\",", "borderBottom: idx < filteredHistory.length - 1 ? `1px solid ${S.border}` : \"none\",")

content = content.replace("{recentCompleted.length > itemsPerPage && (", "{filteredHistory.length > itemsPerPage && (")
content = content.replace("Math.min(currentPageHistory * itemsPerPage, recentCompleted.length)} dari {recentCompleted.length}", "Math.min(currentPageHistory * itemsPerPage, filteredHistory.length)} dari {filteredHistory.length}")

content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")
content = content.replace("Math.ceil(recentCompleted.length / itemsPerPage)", "Math.ceil(filteredHistory.length / itemsPerPage)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("QC Search and Filter added successfully.")

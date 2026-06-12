import os

path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\EngineeringQCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add passRate calculation
calc_target = "  const failCount = recentCompleted.filter(s => s.qcStatus === 'Fail').length;"
calc_new = calc_target + "\n  const passRate = recentCompleted.length > 0 ? Math.round((passCount / recentCompleted.length) * 100) : 0;"

content = content.replace(calc_target, calc_new)

# Add Total Selesai box
box_target = """              <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                <Shield size={18} />
              </div>
            </div>
          </div>"""

new_boxes = """              <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                <Shield size={18} />
              </div>
            </div>
          </div>
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Total Selesai</p>
                <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{recentCompleted.length}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: S.secondary, flexShrink: 0 }}>
                <CheckCircle size={18} />
              </div>
            </div>
          </div>"""

content = content.replace(box_target, new_boxes)

# Add passrate box
nogo_target = """              <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
                <X size={18} />
              </div>
            </div>
          </div>"""

passrate_box = """              <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
                <X size={18} />
              </div>
            </div>
          </div>
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Pass Rate</p>
                <p style={{ color: S.cyan, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passRate}%</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                <Shield size={18} />
              </div>
            </div>
          </div>"""

content = content.replace(nogo_target, passrate_box)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added extra KPIs to workspace view.")

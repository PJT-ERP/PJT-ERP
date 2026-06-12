import os
import re

file_1 = r"c:\Users\stephanie\PJT Revisi 1\src\app\pages\ProductionPage.tsx"
file_old = r"c:\Users\stephanie\PJT Revisi\src\app\pages\ProductionPage.tsx"

with open(file_old, 'r', encoding='utf-8') as f:
    old_content = f.read()

with open(file_1, 'r', encoding='utf-8') as f:
    new_content = f.read()

# 1. Extract and insert state variables
states = """  const [currentPageReady, setCurrentPageReady] = useState(1);
  const [currentPageInProd, setCurrentPageInProd] = useState(1);
  const [currentPageWaitQC, setCurrentPageWaitQC] = useState(1);
  const itemsPerPage = 10;

  const readyForProduction: any[] = [];
  const inProductionRev: any[] = [];
  const waitingQCRev: any[] = [];"""

state_target = "const waitingQC = salesOrders.filter(so => so.status === 'qc_check');"
new_content = new_content.replace(state_target, state_target + "\n\n" + states)

# 2. Extract tables from old
start_marker = "{/* Ready for Production */}"
end_marker = "{startModal && <StartProductionModal"
tables_code = old_content[old_content.find(start_marker):old_content.find(end_marker)]

# Rename arrays to avoid clashes
tables_code = tables_code.replace("inProduction.length", "inProductionRev.length")
tables_code = tables_code.replace("inProduction.map", "inProductionRev.map")
tables_code = tables_code.replace("inProduction.slice", "inProductionRev.slice")

tables_code = tables_code.replace("waitingQC.length", "waitingQCRev.length")
tables_code = tables_code.replace("waitingQC.map", "waitingQCRev.map")
tables_code = tables_code.replace("waitingQC.slice", "waitingQCRev.slice")

# 3. Fix the waitingQC table to show empty state when empty
# Replace `{waitingQCRev.length > 0 && (` with `<div style={{ width: '100%' }}>`
tables_code = tables_code.replace("{waitingQCRev.length > 0 && (", "<div>")
# Replace the matching closing tag at the end: `        </div>\n      )}` -> `        </div>\n      </div>`
tables_code = tables_code.replace("        </div>\n      )}", "        </div>\n      </div>")

# Inject empty state into waitingQCRev table
header_str = '({waitingQCRev.length})</span>\n            </div>\n          </div>'
empty_state_insert = '''({waitingQCRev.length})</span>
            </div>
          </div>
          {waitingQCRev.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada produk yang selesai diproduksi & menunggu QC</p>
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>'''
tables_code = tables_code.replace(header_str + '\n          <div style={{ display: "flex", flexDirection: "column" }}>', empty_state_insert)

# Close the `) : (` block for waitingQCRev
tables_code = tables_code.replace('            })}\n          </div>\n\n          {/* Pagination Controls for Waiting QC', '            })}\n          </div>\n          )}\n\n          {/* Pagination Controls for Waiting QC')

# 4. Remove the OLD "In Production" block from new_content
# We'll just slice it out
old_in_prod_start = new_content.find("{/* 3. In Production */}")
old_in_prod_end = new_content.find("{assignModal &&", old_in_prod_start)
new_content = new_content[:old_in_prod_start] + new_content[old_in_prod_end:]

# 5. Insert tables into new_content
target_location = "{assignModal &&"
new_content = new_content.replace(target_location, tables_code + "\n      " + target_location)

# 6. Ensure the icon imports are present
if "ChevronLeft" not in new_content:
    new_content = new_content.replace("PlayCircle,", "PlayCircle, ChevronLeft, ChevronRight,")

# 7. Replace old cyan RGB colors with new red RGB colors
new_content = new_content.replace("rgba(6,182,212", "rgba(200,16,46")

with open(file_1, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Tables spliced, old block removed, empty state injected, and colors updated!")

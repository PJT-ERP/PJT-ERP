import os

file_1 = r"c:\Users\stephanie\PJT Revisi 1\src\app\pages\ProductionPage.tsx"
file_old = r"c:\Users\stephanie\PJT Revisi\src\app\pages\ProductionPage.tsx"

with open(file_old, 'r', encoding='utf-8') as f:
    old_content = f.read()

with open(file_1, 'r', encoding='utf-8') as f:
    new_content = f.read()

# Extract state variables from old
states = """  const [currentPageReady, setCurrentPageReady] = useState(1);
  const [currentPageInProd, setCurrentPageInProd] = useState(1);
  const [currentPageWaitQC, setCurrentPageWaitQC] = useState(1);
  const itemsPerPage = 10;

  const readyForProduction: any[] = [];
  const inProductionRev: any[] = [];
  const waitingQCRev: any[] = [];"""

# Insert states
state_target = "const waitingQC = salesOrders.filter(so => so.status === 'qc_check');"
new_content = new_content.replace(state_target, state_target + "\n\n" + states)

# Extract tables from old
start_marker = "{/* Ready for Production */}"
end_marker = "{startModal && <StartProductionModal"
tables_code = old_content[old_content.find(start_marker):old_content.find(end_marker)]

# The copied code uses inProduction and waitingQC. We need to rename them to inProductionRev and waitingQCRev
tables_code = tables_code.replace("inProduction.length", "inProductionRev.length")
tables_code = tables_code.replace("inProduction.map", "inProductionRev.map")
tables_code = tables_code.replace("inProduction.slice", "inProductionRev.slice")

tables_code = tables_code.replace("waitingQC.length", "waitingQCRev.length")
tables_code = tables_code.replace("waitingQC.map", "waitingQCRev.map")
tables_code = tables_code.replace("waitingQC.slice", "waitingQCRev.slice")

# Insert tables
target_location = "{/* 3. In Production */}"
new_content = new_content.replace(target_location, tables_code + "\n\n      " + target_location)

# Ensure the icon imports are present
# We need ChevronLeft, ChevronRight
if "ChevronLeft" not in new_content:
    new_content = new_content.replace("PlayCircle,", "PlayCircle, ChevronLeft, ChevronRight,")

with open(file_1, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Tables spliced!")

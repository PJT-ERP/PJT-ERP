import os

path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\EngineeringPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Counts
old_counts = "  const pendingDesignCount = quotations.filter(q => q.status === 'pending_design').length;"
new_counts = """  const revisionCount = quotations.filter(q => q.status === 'pending_design' && !!q.rejectionReason).length;
  const pendingDesignCount = quotations.filter(q => q.status === 'pending_design' && !q.rejectionReason).length;"""
content = content.replace(old_counts, new_counts)

# 2. Summary cards
old_cards = """  const summaryCards = [
    {
      label: "Antrian Desain Baru",
      value: pendingDesignCount,
      icon: <List size={18} />,
      accent: "#C8102E",
      bg: "rgba(200,16,46,0.08)",
      change: "Dari Tim Sales",
    },
    {
      label: "Waiting Spv Approval",
      value: designReviewCount,
      icon: <Clock size={18} />,
      accent: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
      change: "Review Supervisor",
    },
    {
      label: "Proses Produksi",
      value: inProductionCount,
      icon: <Factory size={18} />,
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      change: "Aktif di workshop",
    },
  ];"""

new_cards = """  const summaryCards = [
    {
      label: "Total Antrian",
      value: pendingDesignCount,
      icon: <List size={18} />,
      accent: "#C8102E",
      bg: "rgba(200,16,46,0.08)",
      change: "Tugas Desain Aktif",
    },
    {
      label: "Perlu Revisi",
      value: revisionCount,
      icon: <AlertTriangle size={18} />,
      accent: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
      change: "Dari Supervisor",
    },
    {
      label: "Menunggu Approval",
      value: designReviewCount,
      icon: <Clock size={18} />,
      accent: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
      change: "Sedang di-review",
    },
    {
      label: "In Production",
      value: inProductionCount,
      icon: <Factory size={18} />,
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      change: "Aktif di workshop",
    },
  ];"""

content = content.replace(old_cards, new_cards)

# 3. Workflow Stats
old_stats = """  const workflowStats = [
    { label: "Pending Design",    count: pendingDesignCount,    color: "#94A3B8" },
    { label: "Waiting Spv",       count: designReviewCount,     color: "#8B5CF6" },
    { label: "In Production",     count: inProductionCount,     color: "#3B82F6" },
    { label: "QC",                count: qcCount,               color: "#C8102E" },
  ];"""

new_stats = """  const workflowStats = [
    { label: "Pending Design",    count: pendingDesignCount,    color: "#94A3B8" },
    { label: "Revision Required", count: revisionCount,         color: "#EF4444" },
    { label: "Waiting Approval",  count: designReviewCount,     color: "#8B5CF6" },
    { label: "In Production",     count: inProductionCount,     color: "#3B82F6" },
    { label: "QC",                count: qcCount,               color: "#C8102E" },
  ];"""

content = content.replace(old_stats, new_stats)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Dashboard updated!")

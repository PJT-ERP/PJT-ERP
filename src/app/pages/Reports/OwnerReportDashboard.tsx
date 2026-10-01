import React, { useState, useEffect } from 'react';

interface DailyReport {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  photoUrl?: string;
  reportDate: string;
}

export default function OwnerReportDashboard() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/v1/reports/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchAllReports();
  }, []);

  const roles = Array.from(new Set(reports.map(r => r.userRole)));
  const filteredReports = roleFilter 
    ? reports.filter(r => r.userRole.includes(roleFilter)) 
    : reports;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Company Daily Reports Dashboard</h1>
      
      <div className="mb-6 bg-white p-4 rounded shadow flex items-center gap-4">
        <label className="font-medium">Filter by Role:</label>
        <select 
          className="border rounded p-2"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6">
        {filteredReports.map(report => (
          <div key={report.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row gap-6">
            {report.photoUrl && (
              <img 
                src={`http://localhost:5000${report.photoUrl}`} 
                alt="Report" 
                className="w-full md:w-48 h-48 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold">{report.userName}</h3>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {report.userRole}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(report.reportDate).toLocaleString()}
                </div>
              </div>
              <p className="whitespace-pre-wrap mt-4">{report.description}</p>
            </div>
          </div>
        ))}
        {filteredReports.length === 0 && (
          <div className="text-center p-8 bg-white rounded shadow text-gray-500">
            No reports found for the selected criteria.
          </div>
        )}
      </div>
    </div>
  );
}

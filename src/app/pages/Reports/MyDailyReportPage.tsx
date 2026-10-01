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

export default function MyDailyReportPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/v1/reports/me', {
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

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('description', description);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      const res = await fetch('http://localhost:5000/api/v1/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        setDescription('');
        setPhoto(null);
        fetchReports();
      } else {
        alert('Failed to submit report');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Daily Reports</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New Report</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea 
            className="w-full border rounded p-2" 
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="What did you do today?"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Photo (Optional)</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
            className="w-full"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !description.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4">My Report History</h2>
      <div className="grid gap-4">
        {reports.map(report => (
          <div key={report.id} className="bg-white p-4 rounded shadow flex gap-4">
            {report.photoUrl && (
              <img 
                src={`http://localhost:5000${report.photoUrl}`} 
                alt="Report" 
                className="w-32 h-32 object-cover rounded"
              />
            )}
            <div>
              <div className="text-sm text-gray-500 mb-2">
                {new Date(report.reportDate).toLocaleString()}
              </div>
              <p className="whitespace-pre-wrap">{report.description}</p>
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="text-gray-500">No reports found.</p>}
      </div>
    </div>
  );
}

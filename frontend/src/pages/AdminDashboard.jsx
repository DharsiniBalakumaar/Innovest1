import axios from 'axios';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/admin/pending-users')
      .then(res => setUsers(res.data));
  }, []);

  const approve = id => axios.put(`http://localhost:5000/api/admin/approve/${id}`).then(() => window.location.reload());
  const reject = id => axios.put(`http://localhost:5000/api/admin/reject/${id}`).then(() => window.location.reload());

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
      {users.map(u => (
        <div key={u._id} className="bg-white p-4 mb-2 shadow rounded flex justify-between">
          <div>
            <p>{u.name} ({u.role})</p>
            <a className="text-blue-600" href={`http://localhost:5000/${u.kycDocument}`} target="_blank">View KYC</a>
          </div>
          <div>
            <button onClick={() => approve(u._id)} className="bg-green-500 text-white px-3 py-1 mr-2">Approve</button>
            <button onClick={() => reject(u._id)} className="bg-red-500 text-white px-3 py-1">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

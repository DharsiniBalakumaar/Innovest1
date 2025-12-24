import axios from 'axios';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">User Dashboard</h1>
      <p className="text-gray-600 mt-2">
        Welcome to your dashboard
      </p>
    </div>
  );
}

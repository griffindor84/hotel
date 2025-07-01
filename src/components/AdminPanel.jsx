import React from 'react';
import CreateUserForm from './CreateUserForm';

const AdminPanel = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <h1>Admin Panel</h1>
      <p>Only admins can access this page.</p>
      <CreateUserForm />
    </div>
  );
};

export default AdminPanel;

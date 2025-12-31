import React from 'react';
import { Navigate } from 'react-router-dom';

const Signup: React.FC = () => {
  // Public registration is disabled. Redirect to login.
  return <Navigate to="/login" replace />;
};

export default Signup;
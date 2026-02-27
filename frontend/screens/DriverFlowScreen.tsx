import React from 'react';
import { useDriver } from '../context/DriverContext';
import { DriverDashboardScreen } from './DriverDashboardScreen';
import { ActiveJobScreen } from './ActiveJobScreen';

export const DriverFlowScreen = () => {
  const { activeJob } = useDriver();

  if (activeJob) {
    return <ActiveJobScreen />;
  }

  return <DriverDashboardScreen />;
};

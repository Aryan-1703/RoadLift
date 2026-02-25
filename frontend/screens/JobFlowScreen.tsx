import React from 'react';
import { useJob } from '../context/JobContext';
import { HomeScreen } from './HomeScreen';
import { ServiceSelectionScreen } from './ServiceSelectionScreen';
import { RequestConfirmationScreen } from './RequestConfirmationScreen';
import { LiveTrackingScreen } from './LiveTrackingScreen';
import { PaymentScreen } from './PaymentScreen';
import { JobCompletionScreen } from './JobCompletionScreen';

export const JobFlowScreen = () => {
  const { job } = useJob();

  switch (job.status) {
    case 'selecting': return <ServiceSelectionScreen />;
    case 'confirming': return <RequestConfirmationScreen />;
    case 'searching':
    case 'tracking': return <LiveTrackingScreen />;
    case 'payment': return <PaymentScreen />;
    case 'rating': return <JobCompletionScreen />;
    case 'idle':
    default: return <HomeScreen />;
  }
};

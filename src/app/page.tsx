'use client';

import { useState } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import Modal from '@/components/Layout/Modal';
import MessMembers from '@/components/Pages/MessMembers';
import StockInward from '@/components/Pages/StockInward';
import LiquorInward from '@/components/Pages/LiquorInward';
import StockSummary from '@/components/Pages/StockSummary';
import LiquorSummary from '@/components/Pages/LiquorSummary';
import DailyMessing from '@/components/Pages/DailyMessing';
import BarCounter from '@/components/Pages/BarCounter';
import SnacksAtBar from '@/components/Pages/SnacksAtBar';
import MessingCost from '@/components/Pages/MessingCost';
import ConsumptionSummary from '@/components/Pages/ConsumptionSummary';
import MonthlyCharges from '@/components/Pages/MonthlyCharges';
import RationDemand from '@/components/Pages/RationDemand';
import Attendance from '@/components/Pages/Attendance';
import MonthlyLedger from '@/components/Pages/MonthlyLedger';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('messMembers');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ text: '', type: '' });

  const displayModal = (text: string, type: string) => {
    setModalMessage({ text, type });
    setShowModal(true);
    setTimeout(() => {
      setShowModal(false);
      setModalMessage({ text: '', type: '' });
    }, 3000);
  };

  const renderPage = () => {
    const props = { displayModal };
    
    switch (currentPage) {
      case 'messMembers':
        return <MessMembers {...props} />;
      case 'stockInward':
        return <StockInward {...props} />;
      case 'liquorInward':
        return <LiquorInward {...props} />;
      case 'stockSummary':
        return <StockSummary {...props} />;
      case 'liquorSummary':
        return <LiquorSummary {...props} />;
      case 'dailyMessing':
        return <DailyMessing {...props} />;
      case 'barCounter':
        return <BarCounter {...props} />;
      case 'snacksAtBar':
        return <SnacksAtBar {...props} />;
      case 'messing':
        return <MessingCost {...props} />;
      case 'consumptionSummary':
        return <ConsumptionSummary {...props} />;
      case 'monthlyCharges':
        return <MonthlyCharges {...props} />;
      case 'rationDemand':
        return <RationDemand {...props} />;
      case 'attendance':
        return <Attendance {...props} />;
      case 'monthlyLedger':
        return <MonthlyLedger {...props} />;
      default:
        return <MessMembers {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex font-inter">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>

      {showModal && (
        <Modal message={modalMessage.text} type={modalMessage.type} />
      )}
    </div>
  );
}

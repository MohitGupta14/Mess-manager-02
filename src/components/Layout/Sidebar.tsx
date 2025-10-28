// ===== FILE: src/components/Layout/Sidebar.tsx =====
'use client';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export default function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const navItems = [
    { id: 'messMembers', label: 'Mess Members' },
    { id: 'stockInward', label: 'Stock Inward' },
    { id: 'liquorInward', label: 'Liquor Inward' },
    { id: 'stockSummary', label: 'Stock Summary' },
    { id: 'liquorSummary', label: 'Liquor Summary' },
    { id: 'dailyMessing', label: 'Daily Messing' },
    { id: 'barCounter', label: 'Bar Counter' },
    { id: 'snacksAtBar', label: 'Snacks at Bar' },
    { id: 'messing', label: 'Messing' },
    { id: 'consumptionSummary', label: 'Liquor Consumption' },
    { id: 'monthlyCharges', label: 'Monthly Charges' },
    { id: 'rationDemand', label: 'Ration Demand' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'monthlyLedger', label: 'Monthly Ledger' },
  ];

  return (
    <nav className="w-64 bg-gray-800 text-white p-4 flex flex-col shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-8 border-b border-gray-700 pb-4">
        Mess Manager
      </h1>
      <ul className="space-y-2">
        {navItems.map(item => (
          <li key={item.id}>
            <button
              onClick={() => setCurrentPage(item.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 ${
                currentPage === item.id ? 'bg-blue-600 font-semibold' : 'hover:bg-gray-700'
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
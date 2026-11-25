import React from 'react';
import { Wallet, Banknote, Gift, Store, Smartphone, BookOpen } from 'lucide-react';

export const PaymentSummaryCards = ({ metrics }) => {
  const cards = [
    {
      title: 'Total Money',
      value: metrics.totalMoney || 0,
      icon: Wallet,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Cash',
      value: metrics.totalCash || 0,
      icon: Banknote,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Paid using Reward',
      value: metrics.totalReward || 0,
      icon: Gift,
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Till',
      value: metrics.totalTill || 0,
      icon: Store,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Prompt',
      value: metrics.totalPrompt || 0,
      icon: Smartphone,
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Credit Owed',
      value: metrics.creditOutstanding || 0,
      icon: BookOpen,
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 my-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div
            key={index}
            className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{card.title}</span>
              <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                <IconComponent className={`w-5 h-5 ${card.textColor}`} />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                KES {Number(card.value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// components/Admin/WageRateFields.jsx
export default function WageRateFields({ form, setForm, showCommissionNote }) {
    return (
        <>
            <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">How they're paid</span>
                <div className="grid grid-cols-3 gap-2">
                    {['hourly', 'daily', 'monthly'].map((t) => (
                        <button key={t} type="button" onClick={() => setForm({ ...form, wageType: t })}
                            className={`py-2 rounded-xl text-xs font-extrabold border transition ${form.wageType === t ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-orange-300'}`}>
                            {t[0].toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {form.wageType === 'hourly' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Rate per hour (KES)" value={form.hourlyRate}
                            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="input" />
                        <input type="number" step="0.1" placeholder="Overtime multiplier" value={form.overtimeMultiplier}
                            onChange={(e) => setForm({ ...form, overtimeMultiplier: e.target.value })} className="input" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="time" value={form.schedule?.shiftStart || '08:00'}
                            onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, shiftStart: e.target.value } })} className="input" />
                        <input type="time" value={form.schedule?.shiftEnd || '17:00'}
                            onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, shiftEnd: e.target.value } })} className="input" />
                        <input type="number" placeholder="Disburse after (hrs)" value={form.schedule?.disburseAfterHours || ''}
                            onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, disburseAfterHours: e.target.value } })} className="input" />
                    </div>
                    <p className="text-[10px] text-gray-400 px-0.5">Default shift window, and the hour count that marks a shift payable.</p>
                </div>
            )}

            {form.wageType === 'daily' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Weekday rate (KES)" value={form.dailyRateWeekday}
                            onChange={(e) => setForm({ ...form, dailyRateWeekday: e.target.value })} className="input" />
                        <input type="number" placeholder="Weekend rate (KES)" value={form.dailyRateWeekend}
                            onChange={(e) => setForm({ ...form, dailyRateWeekend: e.target.value })} className="input" />
                    </div>
                    <input type="number" placeholder="Pay every N days" value={form.schedule?.intervalDays || ''}
                        onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, intervalDays: e.target.value } })} className="input" />
                    <p className="text-[10px] text-gray-400 px-0.5">Counted from the day this person started work.</p>
                </div>
            )}

            {form.wageType === 'monthly' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Monthly gross (KES)" value={form.monthlySalary}
                            onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} className="input" />
                        <input type="number" step="0.1" placeholder="Commission % (cashiers only)" value={form.commissionRate}
                            onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} className="input" />
                    </div>
                    <input type="number" min="1" max="31" placeholder="Pay day of month (e.g. 28)" value={form.schedule?.payDay || ''}
                        onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, payDay: e.target.value } })} className="input" />
                    {showCommissionNote && <p className="text-[10px] text-gray-400 px-0.5">{showCommissionNote}</p>}
                </div>
            )}
        </>
    );
}

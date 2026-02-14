import { Link, useLocation } from 'react-router-dom';
import { Home, Pencil, BarChart2, FileText } from 'lucide-react';

interface NavbarProps {
    studentId: number;
    editMode?: boolean;
    onToggleEdit?: () => void;
}

export function Navbar({ studentId, editMode, onToggleEdit }: NavbarProps) {
    const location = useLocation();
    const sid = studentId;

    const isMonitor = location.pathname.startsWith('/monitor');
    const isConsultation = location.pathname.startsWith('/consultation');
    const isReports = location.pathname.startsWith('/reports');

    const navItems = [
        ...(onToggleEdit ? [{
            key: 'edit',
            label: editMode ? '편집 완료' : '행동 편집',
            icon: <Pencil size={18} />,
            active: editMode || false,
            activeColor: 'bg-orange-100 text-orange-600 border-orange-300',
            onClick: onToggleEdit,
        }] : []),
        {
            key: 'monitor',
            label: '행동 기록',
            icon: <Pencil size={18} />,
            to: `/monitor/${sid}`,
            active: isMonitor,
            activeColor: 'bg-blue-100 text-blue-700 border-blue-300',
        },
        {
            key: 'consultation',
            label: '데이터 분석',
            icon: <BarChart2 size={18} />,
            to: `/consultation/${sid}`,
            active: isConsultation,
            activeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        },
        {
            key: 'reports',
            label: 'AI 리포트',
            icon: <FileText size={18} />,
            to: `/reports/${sid}`,
            active: isReports,
            activeColor: 'bg-violet-100 text-violet-700 border-violet-300',
        },
    ];

    return (
        <div className="sticky top-0 z-20">
            {/* 상단 헤더 */}
            <header className="bg-white/95 backdrop-blur-md px-6 py-3 shadow-sm border-b border-slate-100">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                            <span className="text-white text-sm font-black">F</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">기능적행동 평가도구</h1>
                        </div>
                    </Link>
                    <Link to="/" className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all">
                        <Home size={16} />
                        학생 목록
                    </Link>
                </div>
            </header>

            {/* 하위 네비게이션 */}
            <nav className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto flex">
                    {navItems.map(item => {
                        if ('onClick' in item && item.onClick) {
                            return (
                                <button
                                    key={item.key}
                                    onClick={item.onClick}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${item.active
                                            ? `${item.activeColor} border-current`
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            );
                        }
                        return (
                            <Link
                                key={item.key}
                                to={(item as { to: string }).to}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${item.active
                                        ? `${item.activeColor} border-current`
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

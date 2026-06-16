import { Archive, BookOpen, Plus } from 'lucide-react'

export default function BottomNav({ active, onNavigate }) {
  const items = [
    { id: 'days', label: 'Days', icon: BookOpen },
    { id: 'add', label: '新增', icon: Plus },
    { id: 'backup', label: '备份', icon: Archive },
  ]

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          className={active === id ? 'is-active' : ''}
          key={id}
          onClick={() => onNavigate(id)}
          type="button"
        >
          <Icon size={20} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

import { Archive, BookOpen, Plus, Target } from 'lucide-react'

export default function BottomNav({ active, onNavigate }) {
  const items = [
    { id: 'days', label: 'Days', icon: BookOpen },
    { id: 'quiz', label: 'Quiz', icon: Target },
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'backup', label: 'Backup', icon: Archive },
  ]

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
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

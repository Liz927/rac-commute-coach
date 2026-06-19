import type { QuizFilters } from '../types'

type QuestionFiltersProps = {
  filters: QuizFilters
  availableFilters: {
    packIds: string[]
    domains: string[]
    difficulties: string[]
    tags: string[]
  }
  onChange: (filters: QuizFilters) => void
}

export default function QuestionFilters({
  filters,
  availableFilters,
  onChange,
}: QuestionFiltersProps) {
  function updateFilter(key: keyof QuizFilters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="quiz-filter-panel" aria-label="Question filters">
      <label>
        <span>Pack</span>
        <select value={filters.packId} onChange={(event) => updateFilter('packId', event.target.value)}>
          <option value="all">All packs</option>
          {availableFilters.packIds.map((packId) => (
            <option value={packId} key={packId}>
              {packId}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Domain</span>
        <select value={filters.domain} onChange={(event) => updateFilter('domain', event.target.value)}>
          <option value="all">All domains</option>
          {availableFilters.domains.map((domain) => (
            <option value={domain} key={domain}>
              {domain}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Tag</span>
        <select value={filters.tag} onChange={(event) => updateFilter('tag', event.target.value)}>
          <option value="all">All tags</option>
          {availableFilters.tags.map((tag) => (
            <option value={tag} key={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Difficulty</span>
        <select
          value={filters.difficulty}
          onChange={(event) => updateFilter('difficulty', event.target.value)}
        >
          <option value="all">All levels</option>
          {availableFilters.difficulties.map((difficulty) => (
            <option value={difficulty} key={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

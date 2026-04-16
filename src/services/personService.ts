import { API_COMPANIES } from '@/config/apiConfig'
import type { Person, PersonSummary } from '@/types/person'

const BASE = `${API_COMPANIES}/Persons`

export const personService = {
  getById(id: number): Promise<Person> {
    return fetch(`${BASE}/${id}`)
      .then(r => { if (!r.ok) throw new Error(`Error fetching person ${id}: ${r.statusText}`); return r.json() })
  },
  getFull(limit = 100): Promise<PersonSummary[]> {
    return fetch(`${BASE}/full?limit=${limit}`)
      .then(r => { if (!r.ok) throw new Error(`Error fetching persons: ${r.statusText}`); return r.json() })
  },
}

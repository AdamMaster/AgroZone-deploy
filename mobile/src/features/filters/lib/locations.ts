import type { LocationFilterValue, LocationOption } from '../types/filter.types'

export const getLocationOptionKey = (option: LocationOption) =>
  option.type === 'locality' ? `l-${option.localityFiasId}` : `r-${option.regionIsoCode}`

// В фильтре хранятся только ключи (ФИАС-id или ISO-код региона) — название
// берём из списка локаций.
export function findLocationOption(
  locations: readonly LocationOption[],
  value: LocationFilterValue
): LocationOption | undefined {
  if (value.localityFiasId) {
    return locations.find(option => option.type === 'locality' && option.localityFiasId === value.localityFiasId)
  }

  if (value.regionIsoCode) {
    return locations.find(option => option.type === 'region' && option.regionIsoCode === value.regionIsoCode)
  }

  return undefined
}

export function toLocationFilterValue(option: LocationOption): LocationFilterValue {
  return option.type === 'locality'
    ? { regionIsoCode: undefined, localityFiasId: option.localityFiasId }
    : { regionIsoCode: option.regionIsoCode, localityFiasId: undefined }
}

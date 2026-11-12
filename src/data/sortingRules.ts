import sortingData from "./sortingData.json"

export type SortingItem = (typeof sortingData.items)[number]
export type SortingRule = (typeof sortingData.rules)[number]
export type SortingLocation = (typeof sortingData.locations)[number]

export const sortingItems = sortingData.items.slice().sort((a, b) => a.example.localeCompare(b.example))

export const supportedCities = sortingData.locations
  .map((location) => `${location.city_or_county.split(" (")[0]}, California`)
  .sort((a, b) => a.localeCompare(b))

export function findLocation(city: string): SortingLocation | undefined {
  const cityName = city.split(",")[0].trim().toLowerCase()
  return sortingData.locations.find((location) => location.city_or_county.split(" (")[0].trim().toLowerCase() === cityName)
}

export function findSortingRule(itemClass: string, city: string, homeType: string) {
  const location = findLocation(city)
  if (!location) return undefined
  if (location.location_id === "berkeley_ca" && !homeType) return { location, rule: undefined }

  const rule = sortingData.rules.find((entry) => entry.ruleset_id === location.ruleset_id && entry.item_class === itemClass)
  return { location, rule }
}

export function getBinLabel(bin: string): string {
  switch (bin) {
    case "recycling": return "Recycling"
    case "trash": return "Landfill"
    case "compost": return "Compost / organics"
    case "special_disposal": return "Special disposal"
    case "needs_verification": return "Needs local verification"
    default: return "Check local rules"
  }
}

export function getBinSummary(bin: string): string {
  switch (bin) {
    case "recycling": return "Place in your recycling cart."
    case "trash": return "Place in your landfill cart."
    case "compost": return "Place in your organics cart."
    case "special_disposal": return "Use an approved special collection or drop-off."
    case "needs_verification": return "The available local guidance does not confirm this item’s cart destination. Check the linked local guide before sorting."
    default: return "Check your local guide before sorting."
  }
}

export function getSourceUrl(rule: SortingRule | undefined, location: SortingLocation): string {
  const source = rule?.source_url ?? ""
  return source.startsWith("https://") || source.startsWith("http://") ? source : location.facility_url
}

#!/usr/bin/env bun
/**
 * Look up places with the Google Places API (New): a venue name in, candidates with their full
 * address out. Needs an API key with the Places API (New) enabled, in GOOGLE_PLACES_API_KEY.
 *
 *     bun node_modules/skills-kit/src/places.ts "Telliskivi Loomelinnak, Tallinn" [--limit 5] [--region EE]
 *
 * It prints {"results": [{place_id, name, address, location: {lat, lng}, business_status, types,
 * maps_url}]}, best match first: the same fields goplaces gave, minus ratings and opening hours,
 * which Google bills at a higher rate. Scripts import `searchPlaces()`.
 */

import { parseArgs } from "node:util";

export type Place = {
  place_id: string;
  name: string;
  address: string;
  location?: { lat: number; lng: number };
  business_status?: string;
  types?: string[];
  maps_url?: string;
};

/** A place as the API returns it, with the fields FIELDS asks for. */
type ApiPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  businessStatus?: string;
  types?: string[];
  googleMapsUri?: string;
};

const FIELDS = ["id", "displayName", "formattedAddress", "location", "businessStatus", "types", "googleMapsUri"];

type Options = { limit?: number; region?: string; apiKey?: string };

/** Search places by text, best match first. Throws with Google's message on failure. */
export async function searchPlaces(query: string, { limit = 5, region, apiKey = Bun.env.GOOGLE_PLACES_API_KEY }: Options = {}): Promise<Place[]> {
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELDS.map(field => `places.${field}`).join(","),
    },
    body: JSON.stringify({ textQuery: query, pageSize: limit, ...(region && { regionCode: region }) }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { places?: ApiPlace[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`Places API ${res.status}: ${body.error?.message ?? res.statusText}`);
  return (body.places ?? []).map(place => ({
    place_id: place.id,
    name: place.displayName?.text ?? "",
    address: place.formattedAddress ?? "",
    location: place.location && { lat: place.location.latitude, lng: place.location.longitude },
    business_status: place.businessStatus,
    types: place.types,
    maps_url: place.googleMapsUri,
  }));
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      limit: { type: "string", default: "5" },
      region: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });
  const query = positionals.join(" ").trim();
  if (values.help || !query) {
    console.error('usage: places.ts "<venue, city>" [--limit 5] [--region EE]');
    process.exit(values.help ? 0 : 2);
  }
  try {
    const results = await searchPlaces(query, { limit: Number(values.limit), region: values.region });
    console.log(JSON.stringify({ results }, null, 2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

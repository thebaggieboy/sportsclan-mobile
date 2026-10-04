// Metro selects the `.native.tsx` or `.web.tsx` implementation per platform.
// This fallback keeps TypeScript and other platform builds aligned with the web picker.
export { default } from "./VenueLocationMap.web";

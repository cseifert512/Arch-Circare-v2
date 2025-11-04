# Archipedia - Architectural Precedent Search Engine

A sophisticated web-based search engine for discovering architectural projects through natural language descriptions or image uploads. Built for architects and designers with transparent matching algorithms and intuitive filtering controls.

## Features

### Search Modes
- **Text Search**: Describe architectural projects using natural language
- **Image Search**: Upload reference photos, sketches, or screenshots to find similar projects

### Intelligent Matching
Three adjustable weighting dials control how results are prioritized:
- **Visual Similarity** (Blue): Form, materials, aesthetic style
- **Spatial Logic** (Green): Layout, circulation, program organization  
- **Regional Similarity** (Orange): Climate, culture, building context

### Advanced Filtering
- Year built (range slider)
- Architectural style (Modern, Contemporary, Brutalist, etc.)
- Building type (Cultural, Educational, Residential, etc.)
- Climate zone
- Project scale
- Architect nationality

### Professional Interface
- Clean, minimal design focused on beautiful architectural photography
- Grid and list view options
- Sort by relevance, date, or popularity
- Bookmark and share functionality
- Responsive layout for desktop and tablet

## Technology Stack

- React with TypeScript
- Wouter for routing
- Tailwind CSS for styling
- Shadcn/UI components
- Lucide React for icons
- Unsplash for architectural imagery

## Pages

1. **Homepage**: Two-card entry point for text or image search
2. **Text Search**: Large textarea with example prompts
3. **Image Search**: Drag-and-drop upload interface
4. **Results**: Grid view with sidebar filters and weighting dials
5. **Empty State**: Helpful messaging when no results found

## Design System

### Colors
- Primary Blue: #4A90E2 (visual similarity)
- Secondary Green: #7ED321 (spatial logic)
- Tertiary Orange: #F5A623 (regional similarity)
- Neutrals: White, grays, and charcoal for text

### Typography
- Clean, modern sans-serif (system fonts)
- Scale from 11px to 48px
- Clear hierarchy with font weights

### Components
- Circular dials with draggable interaction
- Collapsible filter sections
- Image cards with hover states
- Custom sliders and checkboxes

## Usage

Navigate between pages:
- `/` - Homepage
- `/search/text` - Text search interface
- `/search/image` - Image upload interface
- `/results?q=query` - Results with filters

Adjust the three weighting dials to control matching priority. The percentages automatically balance to 100%.

Apply filters to narrow results by year, style, type, climate, and more.

## Mock Data

The application includes 15 curated architectural projects from renowned architects including:
- Jean Nouvel (Louvre Abu Dhabi)
- Louis Kahn (Salk Institute)
- Tadao Ando (Chichu Art Museum)
- OMA / Rem Koolhaas (Seattle Central Library)
- And more...

## Future Enhancements

- Real search API integration
- User accounts and saved searches
- Project detail pages
- Advanced spatial analysis
- Climate zone mapping
- Export and sharing capabilities

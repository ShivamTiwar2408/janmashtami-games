# Generate Arrange Game - AI Prompt

## Project Overview
Create a React TypeScript drag-and-drop puzzle game called "Divine Stories Arrange" where players arrange story tiles in chronological order. The game features three different story categories: Krishna Lila, Mahabharat, and Gaur Lila.

## Technical Requirements

### Dependencies
- React 19.1.0 with TypeScript
- Muuri 0.9.5 (drag-and-drop grid library)
- React Router DOM for navigation
- CSS with modern features (gradients, backdrop-filter, animations)

### File Structure
```
src/games/arrange/
├── index.tsx (main game component)
├── ArrangeGame.css (comprehensive styling)
└── ../../types/muuri.d.ts (TypeScript definitions)
```

## Core Features

### 1. Game States
- **selecting**: Category selection screen
- **playing**: Active gameplay with timer
- **victory-video**: 15-second celebration video
- **won**: Victory screen with animations
- **lost**: Time-up screen

### 2. Story Categories
Create three story categories with 8-9 events each:

**Krishna Lila Stories:**
1. Krishna's Birth
2. Vasudeva Carries Krishna  
3. Damodar Lila
4. Krishna Humbles Brahma
5. Krishna Defeats Kaliya
6. Lifting Govardhan Hill
7. Leaving Vrindavan
8. Going to Gurukul
9. Defeating Kamsa

**Mahabharat Stories:**
1. Birth of Pandavas
2. Education at Hastinapur
3. Tournament Display
4. Marriage to Draupadi
5. The Dice Game
6. Forest Exile
7. Kurukshetra War
8. Victory of Dharma

**Gaur Lila Stories:**
1. Birth of Chaitanya
2. Divine Childhood
3. Student Life
4. Starting Sankirtan
5. Taking Sannyasa
6. Visiting Vrindavan
7. Jagannath Puri
8. Final Pastimes

### 3. Game Mechanics
- **Timer**: 60-second countdown with warning animation at ≤10 seconds
- **Drag & Drop**: Muuri-powered grid system with smooth animations
- **Win Condition**: All tiles arranged in correct chronological order
- **Shuffle**: Stories randomly shuffled at game start
- **Responsive**: Works on desktop, tablet, and mobile

## UI/UX Design

### Visual Theme
- **Background**: Purple gradient (135deg, #667eea 0%, #764ba2 100%)
- **Glass morphism**: Backdrop blur effects with semi-transparent backgrounds
- **Color scheme**: White text with purple accents
- **Typography**: Arial font family with various weights

### Category Selection Screen
- Hero title: "Choose Your Adventure"
- Three category cards with:
  - Gradient backgrounds with glass morphism
  - Category title and description
  - Event count display
  - Hover animations (lift effect)

### Game Screen Layout
- **Header**: Game title, subtitle, and timer (top-right)
- **Instructions**: Clear guidance text in glass container
- **Game Grid**: 600x600px Muuri grid (responsive)
- **Tiles**: 180x180px squares with images and titles
- **Back Button**: Top-left corner navigation

### Tile Design
- White background with subtle borders
- Image (70% height) + title overlay (30% height)
- Hover effects: lift animation with enhanced shadows
- Grab/grabbing cursor states

## Animations & Effects

### Victory Celebrations
- **Particle System**: 200 animated emojis (🎉, ✨, 🌟, 🎊, 💫, 🏆, 🎈, 🌈)
- **Fireworks**: 20 firework elements with spark animations
- **Victory Video**: Auto-play celebration video for 15 seconds
- **Stats Display**: Time taken and accuracy metrics

### Responsive Breakpoints
- **Desktop**: Full 600x600 grid, 180px tiles
- **Tablet (≤768px)**: 480x480 grid, 150px tiles
- **Mobile (≤480px)**: 360x360 grid, 110px tiles

## Implementation Details

### TypeScript Interfaces
```typescript
interface ArrangeGameProps {
    onBack: () => void;
}

interface LilaStory {
    id: string;
    image: string;
    title: string;
    order: number;
}

type GameCategory = 'krishna-lila' | 'mahabharat' | 'gaur-lila';

interface GameCategoryData {
    id: GameCategory;
    title: string;
    subtitle: string;
    stories: LilaStory[];
}
```

### Key Functions
- `shuffleArray()`: Fisher-Yates shuffle algorithm
- `checkWinCondition()`: Compare current order with correct sequence
- `formatTime()`: Convert seconds to MM:SS format
- `handleCategorySelect()`: Initialize game with selected category
- `resetGame()`: Restart current category
- `goBackToSelection()`: Return to category selection

### Muuri Configuration
```javascript
new Muuri(gridRef.current, {
    items: '.tile',
    dragEnabled: true,
    layout: {
        fillGaps: false,
        horizontal: false,
        alignRight: false,
        alignBottom: false,
        rounding: true
    }
});
```

## Asset Requirements
- Story images in `/public/krishna_lila/` directory
- Victory video: `/public/YudhistirQuest_Won.mp4`
- Fallback image: `/public/krishna_with_flute.jpg`
- Landing image: `/public/krishna_lila_landing.png`

## Accessibility & Performance
- Keyboard navigation support
- Screen reader friendly
- Optimized image loading with error fallbacks
- Smooth 60fps animations
- Mobile touch-friendly interactions

## Integration Notes
- Export as default React component
- Accepts `onBack` prop for navigation
- Uses React Router for routing
- Compatible with Vercel Analytics
- No external API dependencies

Generate a complete, production-ready implementation following this specification exactly, ensuring all animations, responsive design, and game mechanics work flawlessly across all devices.
# 🗺️ Congressional Atlas - Interactive US Political History Map

A modern, interactive web application that visualizes the complete history of US Congressional districts, representatives, and political evolution from 1789 to present.

## ✨ Features

### 🎯 Core Features
- **Interactive US Map**: Explore all congressional districts with smooth zooming and panning
- **Historical Time Slider**: Travel through 235+ years of US political history (1789-2024)
- **Representative Database**: Comprehensive information about every representative
- **Wikipedia Integration**: Automatic fetching of biographical data, education, family, and career information
- **Political Stances**: View key policy positions and voting records
- **Debate History**: Presidential and congressional debate information
- **Battleground Indicators**: Highlight competitive districts and swing regions

### 🎨 Visualization Options
- **Color by Party**: Democrat (Blue), Republican (Red), Independent (Purple)
- **Color by Margin**: Victory margins in elections (Safe, Lean, Competitive)
- **Color by Turnout**: Voter participation rates
- **Battleground Mode**: Highlight historically competitive districts

### 📊 Data & Information
- Representative biographies (early life, education, family)
- Term of service details
- Political party affiliations
- Key policy positions and stances
- Notable debates and political events
- Election history and margins
- District demographics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone or navigate to the project directory**
```bash
cd CAC
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:3000`

### Building for Production
```bash
npm run build
npm run preview
```

## 🎮 How to Use

### Navigation
1. **Time Travel**: Use the bottom time slider to navigate through different years
   - Click and drag the slider
   - Use play/pause button for automatic timeline progression
   - Jump 10 years forward/backward with skip buttons
   - Adjust playback speed (0.5x, 1x, 2x, 4x)

2. **Map Interaction**
   - Click any district to view representative information
   - Hover over districts for quick info tooltips
   - Zoom in/out with mouse wheel or trackpad
   - Pan by clicking and dragging

3. **View Controls**
   - **Color By Selector**: Change map coloring scheme
     - Party Affiliation: See political party control
     - Election Margin: View competitive vs. safe districts
     - Voter Turnout: Visualize civic engagement
   - **Battlegrounds Toggle**: Highlight historically competitive districts

4. **Representative Panel**
   - Automatically loads when you click a district
   - Shows comprehensive biographical information
   - View Wikipedia articles for more details
   - Browse key political stances and debate history

### Features in Detail

#### Time Slider
- **Yellow markers** indicate major election years
- **Auto-play mode** for animated historical progression
- **Speed controls** for custom viewing pace
- **Era labels** (1789, 1900, 2000, 2024)

#### Representative Information
Each representative profile includes:
- Full name and party affiliation
- District and state
- Term of service (start-end years)
- Biography and early life
- Educational background
- Family information
- Career highlights
- Key policy stances
- Notable debates
- Direct Wikipedia link

## 🏗️ Project Structure

```
CAC/
├── src/
│   ├── components/
│   │   ├── Header.tsx           # App header with controls
│   │   ├── Map.tsx              # Interactive D3 map component
│   │   ├── TimeSlider.tsx       # Historical timeline slider
│   │   └── RepresentativePanel.tsx # Side panel with rep info
│   ├── store/
│   │   └── useStore.ts          # Zustand state management
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── utils/
│   │   └── wikiApi.ts           # Wikipedia API integration
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                 # Application entry point
│   └── index.css                # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🛠️ Technology Stack

### Frontend Framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

### Visualization
- **D3.js** - Map rendering and data visualization
- **TopoJSON** - Efficient geographic data format

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library

### State Management
- **Zustand** - Lightweight state management

### Data Sources
- **Wikipedia API** - Biographical and historical data
- **US Atlas** - Geographic boundary data
- **Congressional Districts TopoJSON** - District boundaries

## 🔌 API Integration

### Wikipedia API
The app uses the Wikipedia API to fetch:
- Representative biographies
- Educational history
- Family information
- Career highlights
- Profile images

**Caching**: API responses are cached to minimize requests and improve performance.

### Future Data Sources
Consider integrating:
- **ProPublica Congress API** - Voting records
- **OpenSecrets API** - Campaign finance data
- **Ballotpedia API** - Election results
- **Google Civic Information API** - Current representatives

## 🎨 Customization

### Color Schemes
Edit `tailwind.config.js` to customize party colors:
```javascript
colors: {
  democrat: { ... },
  republican: { ... },
  independent: { ... },
}
```

### Timeline Range
Modify in `src/store/useStore.ts`:
```typescript
timeline: {
  minYear: 1789,  // Change start year
  maxYear: 2024,  // Change end year
}
```

## 📈 Future Enhancements

### Planned Features
- [ ] Real-time data integration with Congress API
- [ ] Voting record visualization
- [ ] Campaign finance data overlay
- [ ] Social media integration
- [ ] Export/share functionality
- [ ] Mobile app version
- [ ] State legislature maps
- [ ] Senate-specific views
- [ ] Gubernatorial history
- [ ] Historical election results overlay
- [ ] Demographic data visualization
- [ ] Issue-based filtering
- [ ] Comparison mode (compare two time periods)
- [ ] 3D terrain visualization
- [ ] AR/VR experience

### Data Improvements
- [ ] Complete historical representative database (1789-present)
- [ ] Full voting record integration
- [ ] Comprehensive debate transcripts
- [ ] Policy position tracking over time
- [ ] Redistricting history visualization
- [ ] Population density overlay

## 🤝 Contributing

Contributions are welcome! Areas that need help:
1. Historical data collection and verification
2. Wikipedia API optimization
3. Mobile responsiveness improvements
4. Additional data source integrations
5. Performance optimizations
6. UI/UX enhancements

## 📝 License

This project is for educational and informational purposes.

## 🙏 Acknowledgments

- **US Census Bureau** - Geographic data
- **Wikipedia** - Biographical information
- **TopoJSON** - Map data format
- **D3.js Community** - Visualization tools

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

---

**Built with ❤️ for political transparency and civic education**

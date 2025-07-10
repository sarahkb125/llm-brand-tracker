# LLM Brand Tracker

A brand monitoring and competitive intelligence platform that analyzes how you and your competitor brands are mentioned and discussed across various topics in LLM responses. In its current iteration, this project only looks at ChatGPT (future platforms will be added).

## 🎯 Overview

A web application focused on brand positioning and mentions in LLMs, starting with ChatGPT today. Specific components:
- prompt research & analysis
- brand mentions, both your own and competitors
- sources cited in prompts

It automatically scrapes brand websites, generates targeted prompts, and processes responses to provide actionable areas of improvement, like where your brand should be mentioned. The flow:
- analyze your own provided website
- figure out competitors, with user input
- use ChatGPT to generate diverse prompts
- use ChatGPT to fetch prompt results
- display prompt results and sources cited

## ✨ Key Features

- **Website Analysis**: Automatically scrapes and analyzes your brand website
- **Competitor Tracking**: Identifies and monitors competitor mentions in ChatGPT responses
- **Prompt Generation**: Creates diverse, relevant prompts for comprehensive brand analysis
- **Source Attribution**: Tracks which sources and domains are cited in responses
- **Progress Over Time**: Monitor analysis progress over time
- **Actionable Next Steps**: Identifies where your brand should be mentioned but isn't

## 🏗️ Architecture

### Backend Stack
- **Node.js/Express**: RESTful API server
- **PostgreSQL**: Primary database with Drizzle ORM
- **OpenAI API**: LLM integration for analysis
- **WebSocket**: Real-time progress updates

### Frontend Stack
- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Vite**: Fast development and build tooling

### Database Schema
- **Topics**: Analysis categories and themes
- **Prompts**: Generated analysis questions
- **Responses**: AI-generated brand analysis
- **Competitors**: Competitor tracking and mentions
- **Sources**: Citation and domain tracking
- **Analytics**: Aggregated metrics and insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (local or cloud)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/llm-brand-tracker.git
   cd llm-brand-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   
   **Temp Solution: Local PostgreSQL**
   ```bash
   # Install PostgreSQL (macOS with Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Edit the following bash replacing "your_password" with the password you would like.
   createdb brand_tracker
   psql -d brand_tracker -c "CREATE USER admin WITH PASSWORD 'your_password';"
   psql -d brand_tracker -c "GRANT ALL PRIVILEGES ON DATABASE brand_tracker TO admin;"
   psql -d brand_tracker -c "GRANT ALL ON SCHEMA public TO admin;"
   ```
   
4. **Set up environment variables**
   Create a `.env` file in the root directory and add the following:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://admin:your_password@localhost:5432/brand_tracker
   # Replace 'your_password' with the password you set when creating the user
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Application Configuration
   NODE_ENV=development
   
   # Analysis Settings (optional)
   PROMPTS_PER_TOPIC=20
   ANALYSIS_FREQUENCY=daily
   ```

   Then run:
   ```bash
   npm install dotenv
   ```

5. **Push database schema**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

## 📖 Usage

### 1. Brand Analysis Setup
- Navigate to the dashboard
- Enter your brand URL (e.g., `https://yourbrand.com`)
- Configure analysis settings (number of topics, prompts per topic)

### 2. Run Analysis
- Click "Start Analysis" to begin the automated process
- Monitor real-time progress through the web interface
- View live updates as prompts are generated and processed

### 3. Review Results
- **Overview Metrics**: High-level brand mention statistics
- **Topic Analysis**: Brand perception across different categories
- **Competitor Analysis**: Competitive landscape insights
- **Source Analysis**: Citation and domain tracking

## 🛠️ Development & Future

There are many improvements to make. Here are a few issues that need to be addressed:
1. **Local Postgres only**. This currently only works with local postgres. If you wipe this locally, all your historical analysis is lost.
2. **No deployment options**. This isn't dockerized, so there's no way to host this somewhere.
3. **Prompts are redundant**. There isn't enough differentiation among prompt structure, so results are skewed.
4. **Prompt specificity**. Prompts are too specific to devtools; need better prompting to get prompts.
5. **Competitor compleness**. Getting competitors is a bit buggy, could use prompt iteration.
6. **UI bugs**. The UI is sometimes unintuitive, sharp on the edges, or even buggy.
7. **Speed & repeatability**. The analysis only runs when you press a button, but should run in the background. It's also super slow.
8. **Auth**. Even if we did deploy it somewhere, there's no auth (user/pw even).
9. **Error handling**. There are still some hard coded values, do better error handling to not have fallbacks.

The above is why this project is public. Let's fix this and all benefit from better brand LLM visibility.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

**Issues**: Report bugs and feature requests on GitHub. Better yet, contribute and fix them.

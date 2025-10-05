import { TestResult, TestError } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface TestReportData {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  results: TestResult[];
  errors: TestError[];
  screenshots: string[];
  performance: {
    pageLoadTimes: { [key: string]: number };
    apiResponseTimes: { [key: string]: number };
  };
  supabase: {
    connectionStatus: boolean;
    apiCalls: number;
    errors: string[];
  };
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

export class TestReporter {
  private reportData: TestReportData;
  private screenshotsDir: string;
  private reportsDir: string;

  constructor() {
    this.screenshotsDir = path.join(__dirname, '../reports');
    this.reportsDir = path.join(__dirname, '../reports');
    this.reportData = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      results: [],
      errors: [],
      screenshots: [],
      performance: {
        pageLoadTimes: {},
        apiResponseTimes: {}
      },
      supabase: {
        connectionStatus: false,
        apiCalls: 0,
        errors: []
      },
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    };
  }

  addTestResult(result: TestResult) {
    this.reportData.results.push(result);
    this.reportData.totalTests++;
    
    if (result.status === 'passed') {
      this.reportData.passedTests++;
    } else if (result.status === 'failed') {
      this.reportData.failedTests++;
    } else if (result.status === 'skipped') {
      this.reportData.skippedTests++;
    }
  }

  addError(error: TestError) {
    this.reportData.errors.push(error);
  }

  addScreenshot(screenshotPath: string) {
    this.reportData.screenshots.push(screenshotPath);
  }

  addPerformanceData(pageName: string, loadTime: number) {
    this.reportData.performance.pageLoadTimes[pageName] = loadTime;
  }

  addSupabaseData(connectionStatus: boolean, apiCalls: number, errors: string[]) {
    this.reportData.supabase.connectionStatus = connectionStatus;
    this.reportData.supabase.apiCalls = apiCalls;
    this.reportData.supabase.errors = errors;
  }

  addCoverageData(statements: number, branches: number, functions: number, lines: number) {
    this.reportData.coverage.statements = statements;
    this.reportData.coverage.branches = branches;
    this.reportData.coverage.functions = functions;
    this.reportData.coverage.lines = lines;
  }

  setDuration(duration: number) {
    this.reportData.duration = duration;
  }

  generateHTMLReport(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportsDir, `production-verification-${timestamp}.html`);
    
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Vérification Production - BazarKELY</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .number {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .test-result {
            background: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .test-result.failed {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        .test-result.skipped {
            border-left-color: #ffc107;
            background: #fffbf0;
        }
        .test-name {
            font-weight: bold;
            color: #333;
        }
        .test-duration {
            color: #666;
            font-size: 0.9em;
        }
        .error-details {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
        .screenshot {
            max-width: 100%;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            margin: 10px 0;
        }
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .performance-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
        }
        .performance-item h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .performance-item .time {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }
        .supabase-status {
            background: #e8f5e8;
            border: 1px solid #28a745;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
        }
        .supabase-status.error {
            background: #fff5f5;
            border-color: #dc3545;
        }
        .coverage-bar {
            background: #e9ecef;
            border-radius: 10px;
            height: 20px;
            margin: 5px 0;
            overflow: hidden;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Rapport de Vérification Production</h1>
            <p>BazarKELY - ${this.reportData.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Tests Totaux</h3>
                <div class="number">${this.reportData.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Tests Réussis</h3>
                <div class="number passed">${this.reportData.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Tests Échoués</h3>
                <div class="number failed">${this.reportData.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Tests Ignorés</h3>
                <div class="number skipped">${this.reportData.skippedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Durée Totale</h3>
                <div class="number">${(this.reportData.duration / 1000).toFixed(2)}s</div>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📊 Résultats des Tests</h2>
                ${this.generateTestResultsHTML()}
            </div>
            
            <div class="section">
                <h2>⚡ Performance</h2>
                <div class="performance-grid">
                    ${this.generatePerformanceHTML()}
                </div>
            </div>
            
            <div class="section">
                <h2>🔗 Intégration Supabase</h2>
                ${this.generateSupabaseHTML()}
            </div>
            
            <div class="section">
                <h2>📈 Couverture de Code</h2>
                ${this.generateCoverageHTML()}
            </div>
            
            <div class="section">
                <h2>📸 Captures d'Écran</h2>
                ${this.generateScreenshotsHTML()}
            </div>
            
            <div class="section">
                <h2>❌ Erreurs Détectées</h2>
                ${this.generateErrorsHTML()}
            </div>
        </div>
        
        <div class="footer">
            <p>Rapport généré automatiquement par Playwright Test Suite</p>
            <p>BazarKELY Production Verification - ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(reportPath, html, 'utf8');
    return reportPath;
  }

  private generateTestResultsHTML(): string {
    return this.reportData.results.map(result => `
      <div class="test-result ${result.status}">
        <div class="test-name">${result.title}</div>
        <div class="test-duration">Durée: ${result.duration}ms</div>
        ${result.status === 'failed' && result.error ? `
          <div class="error-details">${result.error.message}</div>
        ` : ''}
      </div>
    `).join('');
  }

  private generatePerformanceHTML(): string {
    return Object.entries(this.reportData.performance.pageLoadTimes).map(([page, time]) => `
      <div class="performance-item">
        <h4>${page}</h4>
        <div class="time">${time}ms</div>
      </div>
    `).join('');
  }

  private generateSupabaseHTML(): string {
    const statusClass = this.reportData.supabase.connectionStatus ? '' : 'error';
    return `
      <div class="supabase-status ${statusClass}">
        <h3>Statut de Connexion: ${this.reportData.supabase.connectionStatus ? '✅ Connecté' : '❌ Déconnecté'}</h3>
        <p>Appels API: ${this.reportData.supabase.apiCalls}</p>
        ${this.reportData.supabase.errors.length > 0 ? `
          <h4>Erreurs Supabase:</h4>
          <ul>
            ${this.reportData.supabase.errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  private generateCoverageHTML(): string {
    return `
      <div class="coverage-item">
        <h4>Statements</h4>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${this.reportData.coverage.statements}%"></div>
        </div>
        <p>${this.reportData.coverage.statements}%</p>
      </div>
      <div class="coverage-item">
        <h4>Branches</h4>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${this.reportData.coverage.branches}%"></div>
        </div>
        <p>${this.reportData.coverage.branches}%</p>
      </div>
      <div class="coverage-item">
        <h4>Functions</h4>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${this.reportData.coverage.functions}%"></div>
        </div>
        <p>${this.reportData.coverage.functions}%</p>
      </div>
      <div class="coverage-item">
        <h4>Lines</h4>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${this.reportData.coverage.lines}%"></div>
        </div>
        <p>${this.reportData.coverage.lines}%</p>
      </div>
    `;
  }

  private generateScreenshotsHTML(): string {
    return this.reportData.screenshots.map(screenshot => `
      <div>
        <h4>${path.basename(screenshot)}</h4>
        <img src="${screenshot}" alt="Screenshot" class="screenshot">
      </div>
    `).join('');
  }

  private generateErrorsHTML(): string {
    if (this.reportData.errors.length === 0) {
      return '<p>✅ Aucune erreur détectée</p>';
    }
    
    return this.reportData.errors.map(error => `
      <div class="error-details">
        <strong>${error.message}</strong>
        <br>
        ${error.stack || ''}
      </div>
    `).join('');
  }

  generateJSONReport(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportsDir, `production-verification-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2), 'utf8');
    return reportPath;
  }
}

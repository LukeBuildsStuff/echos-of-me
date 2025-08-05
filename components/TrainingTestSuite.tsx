'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ValidationResult {
  isValid: boolean
  score: number
  issues: ValidationIssue[]
  recommendations: string[]
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  category: 'data' | 'model' | 'performance' | 'system'
  message: string
  details?: any
}

interface TestCase {
  id: string
  name: string
  category: 'functionality' | 'performance' | 'quality' | 'integration'
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  executionTime?: number
  error?: string
}

interface TestSuite {
  id: string
  name: string
  description: string
  testCases: TestCase[]
  totalTests: number
  passedTests: number
  failedTests: number
  executionTime: number
  coverage: number
}

interface TrainingTestSuiteProps {
  userId?: string
  modelId?: string
}

export default function TrainingTestSuite({ userId, modelId }: TrainingTestSuiteProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'model' | 'suite'>('overview')
  const [loading, setLoading] = useState(false)
  const [dataValidation, setDataValidation] = useState<ValidationResult | null>(null)
  const [modelValidation, setModelValidation] = useState<ValidationResult | null>(null)
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null)
  const [systemHealth, setSystemHealth] = useState<any>(null)

  useEffect(() => {
    loadSystemHealth()
  }, [])

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/training/validate?type=health')
      if (response.ok) {
        const data = await response.json()
        setSystemHealth(data)
      }
    } catch (error) {
      console.error('Failed to load system health:', error)
    }
  }

  const runDataValidation = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/training/validate?type=data&userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setDataValidation(data)
      }
    } catch (error) {
      console.error('Data validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const runModelValidation = async () => {
    if (!modelId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/training/validate?type=model&modelId=${modelId}`)
      if (response.ok) {
        const data = await response.json()
        setModelValidation(data)
      }
    } catch (error) {
      console.error('Model validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTestSuite = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/training/validate?type=suite${userId ? `&userId=${userId}` : ''}`)
      if (response.ok) {
        const data = await response.json()
        setTestSuite(data)
      }
    } catch (error) {
      console.error('Test suite failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'running': return 'text-blue-600 bg-blue-50'
      case 'pending': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-1 bg-peace-100 p-1 rounded-embrace">
        {[
          { id: 'overview', label: '🔍 Overview' },
          { id: 'data', label: '📊 Data Tests' },
          { id: 'model', label: '🤖 Model Tests' },
          { id: 'suite', label: '🧪 Full Suite' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 rounded-embrace text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-hope-700 shadow-md'
                : 'text-peace-600 hover:text-hope-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* System Health */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏥 System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Overall Status:</span>
                    <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                      {systemHealth.status}
                    </Badge>
                  </div>
                  
                  {Object.entries(systemHealth.services).map(([service, status]: [string, any]) => (
                    <div key={service} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{service}:</span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={status.status === 'healthy' ? 'outline' : 'destructive'}
                          className="text-xs"
                        >
                          {status.status}
                        </Badge>
                        {status.latency && (
                          <span className="text-xs text-peace-600">{status.latency}ms</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-peace-600">
                  Loading system health...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚡ Quick Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={runDataValidation}
                disabled={!userId || loading}
                className="w-full"
                variant="outline"
              >
                {loading ? 'Running...' : 'Validate Training Data'}
              </Button>
              
              <Button
                onClick={runModelValidation}
                disabled={!modelId || loading}
                className="w-full"
                variant="outline"
              >
                {loading ? 'Running...' : 'Validate Model Performance'}
              </Button>
              
              <Button
                onClick={runTestSuite}
                disabled={loading}
                className="w-full bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
              >
                {loading ? 'Running...' : 'Run Full Test Suite'}
              </Button>

              {!userId && (
                <p className="text-xs text-peace-600 text-center">
                  Some tests require a specific user context
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Validation Tab */}
      {activeTab === 'data' && (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Training Data Validation</CardTitle>
            <CardDescription>
              Comprehensive analysis of training data quality and readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!dataValidation ? (
              <div className="text-center py-8">
                <Button
                  onClick={runDataValidation}
                  disabled={!userId || loading}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
                >
                  {loading ? 'Validating...' : 'Run Data Validation'}
                </Button>
                {!userId && (
                  <p className="text-sm text-peace-600 mt-2">
                    User ID required for data validation
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {dataValidation.score}/100
                  </div>
                  <Badge variant={dataValidation.isValid ? 'default' : 'destructive'}>
                    {dataValidation.isValid ? 'Ready for Training' : 'Needs Improvement'}
                  </Badge>
                </div>

                {/* Issues */}
                {dataValidation.issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Issues Found</h3>
                    <div className="space-y-2">
                      {dataValidation.issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-embrace border-l-4 ${
                            issue.severity === 'error' ? 'border-red-500 bg-red-50' :
                            issue.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                            'border-blue-500 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{issue.message}</div>
                              {issue.details && (
                                <div className="text-sm text-peace-600 mt-1">
                                  {JSON.stringify(issue.details)}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {dataValidation.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {dataValidation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-hope-500 mt-1">•</span>
                          <span className="text-peace-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Model Validation Tab */}
      {activeTab === 'model' && (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Model Performance Validation</CardTitle>
            <CardDescription>
              Analysis of trained model quality and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!modelValidation ? (
              <div className="text-center py-8">
                <Button
                  onClick={runModelValidation}
                  disabled={!modelId || loading}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
                >
                  {loading ? 'Validating...' : 'Run Model Validation'}
                </Button>
                {!modelId && (
                  <p className="text-sm text-peace-600 mt-2">
                    Model ID required for performance validation
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {modelValidation.score}/100
                  </div>
                  <Badge variant={modelValidation.isValid ? 'default' : 'destructive'}>
                    {modelValidation.isValid ? 'High Quality Model' : 'Performance Issues'}
                  </Badge>
                </div>

                {/* Performance Issues */}
                {modelValidation.issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Performance Analysis</h3>
                    <div className="space-y-2">
                      {modelValidation.issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-embrace border-l-4 ${
                            issue.severity === 'error' ? 'border-red-500 bg-red-50' :
                            issue.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                            'border-blue-500 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{issue.message}</div>
                              {issue.details && (
                                <div className="text-sm text-peace-600 mt-1">
                                  {JSON.stringify(issue.details)}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {modelValidation.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Improvement Suggestions</h3>
                    <ul className="space-y-2">
                      {modelValidation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-hope-500 mt-1">•</span>
                          <span className="text-peace-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Suite Tab */}
      {activeTab === 'suite' && (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Comprehensive Test Suite</CardTitle>
            <CardDescription>
              Full system validation including functionality, performance, and integration tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!testSuite ? (
              <div className="text-center py-8">
                <Button
                  onClick={runTestSuite}
                  disabled={loading}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
                >
                  {loading ? 'Running Test Suite...' : 'Run Complete Test Suite'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Test Results Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-peace-700">{testSuite.totalTests}</div>
                    <div className="text-sm text-peace-600">Total Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{testSuite.passedTests}</div>
                    <div className="text-sm text-peace-600">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{testSuite.failedTests}</div>
                    <div className="text-sm text-peace-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{testSuite.coverage.toFixed(1)}%</div>
                    <div className="text-sm text-peace-600">Coverage</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Test Progress</span>
                    <span>{testSuite.passedTests}/{testSuite.totalTests}</span>
                  </div>
                  <Progress value={testSuite.coverage} className="h-2" />
                </div>

                {/* Test Cases */}
                <div>
                  <h3 className="font-semibold mb-3">Test Cases</h3>
                  <div className="space-y-3">
                    {testSuite.testCases.map((testCase) => (
                      <div key={testCase.id} className="p-4 bg-peace-50 rounded-embrace">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{testCase.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {testCase.category}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(testCase.status)}>
                                {testCase.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-peace-600 mb-2">{testCase.description}</p>
                            
                            {testCase.executionTime && (
                              <div className="text-xs text-peace-500">
                                Execution time: {testCase.executionTime}ms
                              </div>
                            )}
                            
                            {testCase.error && (
                              <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                                Error: {testCase.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution Summary */}
                <div className="text-sm text-peace-600 text-center">
                  Test suite completed in {(testSuite.executionTime / 1000).toFixed(2)} seconds
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
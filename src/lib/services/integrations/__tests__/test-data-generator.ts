import { v4 as uuidv4 } from 'uuid'
import { AnalysisRequest, TicketAnalysis, DetailedFeedback } from '@/types/ai'

type TicketCategory = 
  | 'technical' 
  | 'subscription' 
  | 'app_feature' 
  | 'privacy' 
  | 'urgent' 
  | 'general'
  | 'suicide_risk'
  | 'self_harm'
  | 'panic_attack'
  | 'medical_emergency'
  | 'severe_distress'

interface TestTicketTemplate {
  category: TicketCategory
  templates: string[]
  variables: string[]
  metadata: Record<string, unknown>
}

const ticketTemplates: Record<TicketCategory, TestTicketTemplate> = {
  technical: {
    category: 'technical',
    templates: [
      'I cannot log in to my account. The error message says {error}',
      'The app keeps crashing when I try to {action}',
      'Getting a blank screen when accessing {feature}'
    ],
    variables: [
      'Invalid credentials',
      'Server connection failed',
      'Database error',
      'open chat',
      'access profile',
      'view history',
      'dashboard',
      'settings page',
      'resource library'
    ],
    metadata: {
      priority: 'medium',
      platform: ['web', 'mobile'],
      browser: ['chrome', 'safari', 'firefox']
    }
  },
  subscription: {
    category: 'subscription',
    templates: [
      'Need help updating my {plan_type} subscription',
      'Billing issue with my {duration} subscription',
      'Questions about {feature} in the premium plan'
    ],
    variables: [
      'monthly',
      'annual',
      'premium',
      'basic',
      'team',
      'enterprise',
      'chat support',
      'advanced analytics',
      'custom integrations'
    ],
    metadata: {
      priority: 'low',
      subscription_types: ['basic', 'premium', 'enterprise'],
      payment_methods: ['credit_card', 'paypal', 'wire']
    }
  },
  app_feature: {
    category: 'app_feature',
    templates: [
      'How do I use the {feature} feature?',
      'Cannot find the {action} button',
      'Need help with {setting} configuration'
    ],
    variables: [
      'mood tracking',
      'journal',
      'meditation timer',
      'export data',
      'share progress',
      'customize dashboard',
      'notification',
      'privacy',
      'integration'
    ],
    metadata: {
      priority: 'low',
      feature_type: ['core', 'premium', 'beta'],
      user_type: ['new', 'regular', 'power']
    }
  },
  privacy: {
    category: 'privacy',
    templates: [
      'Concerned about {data_type} data privacy',
      'Need to {action} my personal information',
      'Questions about {policy} compliance'
    ],
    variables: [
      'health',
      'personal',
      'usage',
      'delete',
      'export',
      'modify',
      'GDPR',
      'HIPAA',
      'data retention'
    ],
    metadata: {
      priority: 'high',
      compliance: ['GDPR', 'HIPAA', 'CCPA'],
      data_type: ['personal', 'health', 'usage']
    }
  },
  urgent: {
    category: 'urgent',
    templates: [
      'URGENT: {issue} needs immediate attention',
      'Emergency: Cannot access {critical_feature}',
      'Critical: {error} preventing therapy session'
    ],
    variables: [
      'security breach',
      'data loss',
      'system outage',
      'video call',
      'crisis resources',
      'emergency contact',
      'connection error',
      'authentication failure',
      'payment processing'
    ],
    metadata: {
      priority: 'critical',
      response_time: 'immediate',
      escalation_required: true
    }
  },
  general: {
    category: 'general',
    templates: [
      'Question about {topic}',
      'Need help with {action}',
      'Information request: {subject}'
    ],
    variables: [
      'account settings',
      'getting started',
      'best practices',
      'updating profile',
      'finding resources',
      'contacting support',
      'app navigation',
      'feature overview',
      'user guides'
    ],
    metadata: {
      priority: 'low',
      category: 'general_inquiry'
    }
  },
  suicide_risk: {
    category: 'suicide_risk',
    templates: [
      'I want to end my life {timeframe}',
      'I am going to kill myself {plan}',
      'I cannot go on anymore {context}',
      'Planning to commit suicide {detail}',
      'This is my final message {intent}'
    ],
    variables: [
      'tonight',
      'I have the means ready',
      'I have it all planned out',
      'I\'ve written my note',
      'I\'ve made my decision'
    ],
    metadata: {
      priority: 'critical',
      requiresImmediate: true,
      crisisType: 'suicide_risk',
      severity: 'critical',
      escalationRequired: true,
      responseProtocol: 'immediate_intervention',
      auditLog: ['crisis_detected', 'priority_escalated']
    }
  },
  self_harm: {
    category: 'self_harm',
    templates: [
      'I want to hurt myself {method}',
      'I\'ve been cutting {frequency}',
      'Planning to harm myself {timeframe}',
      'Can\'t stop hurting myself {context}',
      'Need to feel pain {reason}'
    ],
    variables: [
      'again',
      'more than usual',
      'right now',
      'it\'s getting worse',
      'deeper this time'
    ],
    metadata: {
      priority: 'critical',
      requiresImmediate: true,
      crisisType: 'self_harm',
      severity: 'high',
      escalationRequired: true,
      responseProtocol: 'immediate_intervention',
      auditLog: ['crisis_detected', 'priority_escalated']
    }
  },
  panic_attack: {
    category: 'panic_attack',
    templates: [
      'Can\'t breathe {symptoms}',
      'Having a panic attack {context}',
      'Heart racing, need help {severity}',
      'Feel like I\'m dying {description}',
      'Panic attack getting worse {progression}'
    ],
    variables: [
      'right now',
      'chest feels tight',
      'can\'t calm down',
      'losing control',
      'need immediate help'
    ],
    metadata: {
      priority: 'urgent',
      requiresImmediate: true,
      crisisType: 'panic_attack',
      severity: 'high',
      escalationRequired: true,
      responseProtocol: 'rapid_response',
      auditLog: ['crisis_detected', 'priority_escalated']
    }
  },
  medical_emergency: {
    category: 'medical_emergency',
    templates: [
      'Having chest pains {severity}',
      'Difficulty breathing {context}',
      'Feeling faint {symptoms}',
      'Medical condition worsening {progression}',
      'Need emergency help {situation}'
    ],
    variables: [
      'severe',
      'getting worse',
      'can\'t wait',
      'need help now',
      'emergency situation'
    ],
    metadata: {
      priority: 'critical',
      requiresImmediate: true,
      crisisType: 'medical_emergency',
      severity: 'critical',
      escalationRequired: true,
      responseProtocol: 'emergency_services',
      auditLog: ['crisis_detected', 'emergency_escalated']
    }
  },
  severe_distress: {
    category: 'severe_distress',
    templates: [
      'Cannot handle this anymore {context}',
      'Breaking down completely {situation}',
      'Lost all control {description}',
      'Mental state deteriorating {progression}',
      'Overwhelmed and scared {severity}'
    ],
    variables: [
      'need help now',
      'getting worse',
      'can\'t cope',
      'losing grip',
      'at my limit'
    ],
    metadata: {
      priority: 'high',
      requiresImmediate: true,
      crisisType: 'severe_distress',
      severity: 'high',
      escalationRequired: true,
      responseProtocol: 'urgent_intervention',
      auditLog: ['crisis_detected', 'priority_escalated']
    }
  }
}

export function generateTestTicket(
  category?: TicketCategory,
  options?: {
    content?: string,
    metadata?: Record<string, unknown>
  }
): AnalysisRequest {
  const selectedCategory = category || Object.keys(ticketTemplates)[Math.floor(Math.random() * Object.keys(ticketTemplates).length)] as TicketCategory
  const template = ticketTemplates[selectedCategory]
  
  let ticketContent = options?.content || template.templates[Math.floor(Math.random() * template.templates.length)]
  if (!options?.content) {
    ticketContent = ticketContent.replace(/\{(\w+)\}/g, () => {
      const variables = template.variables
      return variables[Math.floor(Math.random() * variables.length)]
    })
  }

  return {
    ticketId: uuidv4(),
    content: ticketContent,
    metadata: {
      ...template.metadata,
      ...options?.metadata,
      timestamp: new Date().toISOString(),
      category: selectedCategory
    },
    config: {
      maxTokens: 1000,
      temperature: 0.7,
      similarityThreshold: 0.7,
      maxPatterns: 5
    }
  }
}

export function generateTestFeedback(ticketId: string, isHelpful: boolean = true): DetailedFeedback {
  const accuracyLevels: Array<'high' | 'medium' | 'low' | 'neutral'> = ['high', 'medium', 'low', 'neutral']
  const randomAccuracy = () => accuracyLevels[Math.floor(Math.random() * accuracyLevels.length)]
  
  return {
    patternId: ticketId,
    helpful: isHelpful,
    accuracy: isHelpful ? 'high' : randomAccuracy(),
    relevance: isHelpful ? 'high' : randomAccuracy(),
    actionability: isHelpful ? 'high' : randomAccuracy(),
    comments: isHelpful 
      ? 'The analysis was very helpful and accurate.'
      : 'The analysis missed some key points.',
    userId: uuidv4(),
    timestamp: new Date()
  }
}

export function generateTestDataset(size: number = 10, category?: TicketCategory): AnalysisRequest[] {
  return Array.from({ length: size }, () => generateTestTicket(category))
}

export function generateRelatedTickets(count: number = 3): string[] {
  return Array.from({ length: count }, () => uuidv4())
} 
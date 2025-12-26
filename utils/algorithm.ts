
import { Relevance, Trend } from '../types';

export const calculateNextReview = (accuracy: number, relevance: Relevance, trend: Trend = Trend.ESTAVEL): Date => {
  let daysToAdd = 1;

  // 1. Lógica Base (Intervalo em Dias baseado na performance)
  if (accuracy < 60) {
    daysToAdd = 1; // Fase de Reaprendizagem (Imediato)
  } else if (accuracy >= 60 && accuracy <= 79) {
    daysToAdd = 3;
  } else if (accuracy >= 80 && accuracy <= 89) {
    daysToAdd = 7;
  } else if (accuracy >= 90) {
    daysToAdd = 15; // Fase de Manutenção
  }

  // 2. Multiplicadores de Relevância (Aceleradores)
  if (relevance === Relevance.ALTISSIMA) {
    // Reduz intervalo em 30% (Prioridade Máxima)
    daysToAdd = daysToAdd * 0.7;
  } else if (relevance === Relevance.ALTA) {
    // Reduz intervalo em 10%
    daysToAdd = daysToAdd * 0.9;
  }

  // 3. Multiplicadores de Tendência (Ajuste Fino)
  // Se a tendência de cobrança é alta, reduzimos o intervalo ligeiramente para garantir segurança
  if (trend === Trend.ALTA) {
    daysToAdd = daysToAdd * 0.9; 
  }

  // Arredondamento e Garantia Mínima
  // Math.round garante inteiros para evitar datas fracionadas
  daysToAdd = Math.max(1, Math.round(daysToAdd));

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  
  // Normalizar horário para evitar problemas de fuso leve (opcional, mas recomendado)
  // nextDate.setHours(0, 0, 0, 0); 
  
  return nextDate;
};

export const getStatusColor = (accuracy: number, target: number): string => {
  if (accuracy === 0) return '#94a3b8'; // Cinza/Slate-400 (Sem dados)
  if (accuracy <= 60) return '#ef4444'; // Vermelho (Crítico)
  if (accuracy < target) return '#f97316'; // Laranja (Atenção)
  return '#22c55e'; // Verde (Dominado)
};

package com.example.fraud_detection_agent.dto;

import java.math.BigDecimal;

public record TransactionResponse(
    String transactionId,
    String userId,
    BigDecimal amount,
    Double fraudScore,
    String fraudStatus,
    String report
) {}
package com.example.fraud_detection_agent.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionRequest(
    @NotBlank String userId,

    @NotNull
    @DecimalMin(value = "0.01")
    BigDecimal amount,

    @NotBlank String merchant,
    @NotBlank String location,
    @NotNull LocalDateTime transactionTime
) {}
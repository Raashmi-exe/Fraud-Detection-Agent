
package com.example.fraud_detection_agent.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionRequest(
    @NotBlank
    String userId,

    @NotNull
    @DecimalMin(value = "0.01")
    BigDecimal amount,

    @NotBlank
    String merchant,

    @NotBlank
    String location,

    @NotNull
    LocalDateTime transactionTime,

    @Pattern(
        regexp = "PAYMENT|TRANSFER|CASH_OUT|DEBIT|CASH_IN",
        message = "Invalid transaction type"
    )
    String transactionType,

    @DecimalMin(value = "0.0")
    BigDecimal oldBalanceOrg,

    @DecimalMin(value = "0.0")
    BigDecimal newBalanceOrig,

    @DecimalMin(value = "0.0")
    BigDecimal oldBalanceDest,

    @DecimalMin(value = "0.0")
    BigDecimal newBalanceDest
) {}

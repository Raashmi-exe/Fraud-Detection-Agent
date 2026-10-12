
package com.example.fraud_detection_agent.service;

import com.example.fraud_detection_agent.client.MlClient;
import com.example.fraud_detection_agent.client.MlClient.MlResult;
import com.example.fraud_detection_agent.dto.TransactionRequest;
import com.example.fraud_detection_agent.dto.TransactionResponse;
import com.example.fraud_detection_agent.model.Transaction;
import com.example.fraud_detection_agent.repository.TransactionRepository;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;

@Service
public class FraudService {

    private final TransactionRepository repository;
    private final MlClient mlClient;

    public FraudService(
            TransactionRepository repository,
            MlClient mlClient) {
        this.repository = repository;
        this.mlClient = mlClient;
    }

    public TransactionResponse process(TransactionRequest request) {

        Transaction tx = new Transaction();

        tx.setTransactionId(
            "TX-" + UUID.randomUUID()
                .toString()
                .substring(0, 8)
        );

        tx.setUserId(request.userId());
        tx.setAmount(request.amount());
        tx.setMerchant(request.merchant());
        tx.setLocation(request.location());
        tx.setTransactionTime(request.transactionTime());

        int hour = request.transactionTime().getHour();

        // Temporary placeholders because the current request
        // does not provide PaySim balance information.
        int unusualLocation = 0;
        String transactionType = "TRANSFER";

        double oldBalanceOrg = 0.0;
        double newBalanceOrig = 0.0;
        double oldBalanceDest = 0.0;
        double newBalanceDest = 0.0;

        MlResult prediction = mlClient.predict(
            request.amount().doubleValue(),
            hour,
            unusualLocation,
            transactionType,
            oldBalanceOrg,
            newBalanceOrig,
            oldBalanceDest,
            newBalanceDest
        );

        if (prediction == null) {
            throw new IllegalStateException(
                "The ML service returned an empty prediction."
            );
        }

        // The Random Forest returns an estimated fraud probability.
        double score = prediction.anomaly_score();

        String status = prediction.anomaly()
                ? "SUSPICIOUS"
                : "SAFE";

        // Corrected format specifiers and matching argument order.
        String report = String.format(
            Locale.ROOT,
            "%s: The %s model returned a fraud probability estimate " +
            "of %.4f for amount %.2f at %02d:00. " +
            "Transaction type: %s. " +
            "PaySim balance features are currently placeholders, " +
            "so this prediction is for integration testing only. " +
            "A model prediction is not proof of fraud; review " +
            "the transaction before taking action.",
            status,
            prediction.model(),
            score,
            request.amount().doubleValue(),
            hour,
            transactionType
        );

        tx.setFraudScore(score);
        tx.setFraudStatus(status);
        tx.setReport(report);

        repository.save(tx);

        return new TransactionResponse(
            tx.getTransactionId(),
            tx.getUserId(),
            tx.getAmount(),
            tx.getFraudScore(),
            tx.getFraudStatus(),
            report
        );
    }
}

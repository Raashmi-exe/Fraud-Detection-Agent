
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

        // Use the transaction type supplied by the request.
        String transactionType =
                request.transactionType() == null
                || request.transactionType().isBlank()
                ? "TRANSFER"
                : request.transactionType().toUpperCase(Locale.ROOT);

        // Default omitted balance fields to zero.
        double oldBalanceOrg =
                request.oldBalanceOrg() == null
                ? 0.0 : request.oldBalanceOrg().doubleValue();

        double newBalanceOrig =
                request.newBalanceOrig() == null
                ? 0.0 : request.newBalanceOrig().doubleValue();

        double oldBalanceDest =
                request.oldBalanceDest() == null
                ? 0.0 : request.oldBalanceDest().doubleValue();

        double newBalanceDest =
                request.newBalanceDest() == null
                ? 0.0 : request.newBalanceDest().doubleValue();

        // Location is not currently a trained model feature.
        int unusualLocation = 0;

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

        double score = prediction.anomaly_score();
        double threshold = prediction.threshold();

        String status = score >= threshold
                ? "SUSPICIOUS"
                : "SAFE";

        String report = String.format(
            Locale.ROOT,
            "%s: The %s model returned a score of %.4f. " +
            "The configured decision threshold is %.2f. " +
            "Amount: %.2f. Transaction time: %02d:00. " +
            "Transaction type: %s. " +
            "Balance inputs: origin %.2f -> %.2f, " +
            "destination %.2f -> %.2f. " +
            "The unusual-location feature is not currently used " +
            "by the trained model. Scores are not calibrated " +
            "real-world fraud probabilities. Review suspicious " +
            "transactions before taking action; a model prediction " +
            "is not proof of fraud.",
            status,
            prediction.model(),
            score,
            threshold,
            request.amount().doubleValue(),
            hour,
            transactionType,
            oldBalanceOrg,
            newBalanceOrig,
            oldBalanceDest,
            newBalanceDest
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

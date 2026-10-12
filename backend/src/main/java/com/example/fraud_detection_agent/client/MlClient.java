
package com.example.fraud_detection_agent.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MlClient {

    private final RestClient client;

    public MlClient() {
        this.client = RestClient.builder()
                .baseUrl(
                    System.getenv().getOrDefault(
                        "ML_URL", "http://localhost:8000"
                    )
                )
                .build();
    }

    public MlResult predict(
            double amount,
            int hour,
            int unusualLocation,
            String transactionType,
            double oldBalanceOrg,
            double newBalanceOrig,
            double oldBalanceDest,
            double newBalanceDest) {

        MlRequest request = new MlRequest(
                amount,
                hour,
                unusualLocation,
                transactionType,
                oldBalanceOrg,
                newBalanceOrig,
                oldBalanceDest,
                newBalanceDest
        );

        return client.post()
                .uri("/predict")
                .body(request)
                .retrieve()
                .body(MlResult.class);
    }

    public record MlRequest(
            double amount,
            int hour,
            int unusual_location,
            String transaction_type,
            double oldbalance_org,
            double newbalance_orig,
            double oldbalance_dest,
            double newbalance_dest) {}

    public record MlResult(
            boolean anomaly,
            double anomaly_score,
            double threshold,
            String model) {}
}

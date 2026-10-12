
package com.example.fraud_detection_agent.controller;

import com.example.fraud_detection_agent.dto.TransactionRequest;
import com.example.fraud_detection_agent.dto.TransactionResponse;
import com.example.fraud_detection_agent.model.Transaction;
import com.example.fraud_detection_agent.repository.TransactionRepository;
import com.example.fraud_detection_agent.service.FraudService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(
    origins = "http://localhost:5173",
    methods = {RequestMethod.GET, RequestMethod.POST}
)
public class TransactionController {

    private final FraudService fraudService;
    private final TransactionRepository transactionRepository;

    public TransactionController(
            FraudService fraudService,
            TransactionRepository transactionRepository) {
        this.fraudService = fraudService;
        this.transactionRepository = transactionRepository;
    }

    // Create a transaction and get its fraud prediction.
    @PostMapping
    public TransactionResponse process(
            @Valid @RequestBody TransactionRequest request) {
        return fraudService.process(request);
    }

    // Retrieve all saved transactions, newest first.
    @GetMapping
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll()
                .stream()
                .sorted((a, b) -> {
                    if (a.getTransactionTime() == null) {
                        return b.getTransactionTime() == null ? 0 : 1;
                    }
                    if (b.getTransactionTime() == null) {
                        return -1;
                    }
                    return b.getTransactionTime()
                            .compareTo(a.getTransactionTime());
                })
                .toList();
    }
}

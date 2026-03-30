package com.microshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;
import java.util.UUID;

@SpringBootApplication
@RestController
public class BackendApplication {
    
    private static final Logger log = LoggerFactory.getLogger(BackendApplication.class);
    
    private List<Map<String, Object>> products = new ArrayList<>();

    public BackendApplication() {
        // Инициализация товаров
        Map<String, Object> product1 = new HashMap<>();
        product1.put("id", 1);
        product1.put("name", "Товар 1");
        product1.put("price", 100);
        product1.put("image", "/media/product1.jpg");
        products.add(product1);
        
        Map<String, Object> product2 = new HashMap<>();
        product2.put("id", 2);
        product2.put("name", "Товар 2");
        product2.put("price", 200);
        product2.put("image", "/media/product2.jpg");
        products.add(product2);
        
        Map<String, Object> product3 = new HashMap<>();
        product3.put("id", 3);
        product3.put("name", "Товар 3");
        product3.put("price", 300);
        product3.put("image", "/media/product3.jpg");
        products.add(product3);
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/api/products")
    public List<Map<String, Object>> getProducts() {
        return products;
    }

    @GetMapping("/api/orders/my")
    public List<Map<String, Object>> getMyOrders() {
        List<Map<String, Object>> orders = new ArrayList<>();
        Map<String, Object> order = new HashMap<>();
        order.put("id", 1);
        order.put("status", "Заказ доставлен в магазин по адресу Университетская площадь, д.1");
        order.put("total", 300);
        orders.add(order);
        return orders;
    }

    @PostMapping("/api/orders/checkout")
    public Map<String, Object> checkout(@RequestHeader(value = "X-Session-Token", required = false) String token) {
        if (token == null) {
            return Map.of("error", "Unauthorized");
        }
        return Map.of(
            "message", "Order created successfully",
            "order_id", 123,
            "status", "Processing"
        );
    }

    @PostMapping(value = "/api/admin/products", consumes = {"multipart/form-data"})
    public Map<String, Object> addProduct(
            @RequestParam("name") String name,
            @RequestParam("price") Integer price,
            @RequestParam("image") MultipartFile file) {
        
        log.info("Adding product: name={}, price={}, file={}", name, price, file.getOriginalFilename());
        
        try {
            // Сохраняем файл
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path path = Paths.get("/tmp/" + fileName);
            Files.write(path, file.getBytes());
            
            // Создаём новый товар
            int newId = products.size() + 1;
            Map<String, Object> newProduct = new HashMap<>();
            newProduct.put("id", newId);
            newProduct.put("name", name);
            newProduct.put("price", price);
            newProduct.put("image", "/media/" + fileName);
            
            products.add(newProduct);
            
            return Map.of(
                "success", true,
                "message", "Product added successfully",
                "product", newProduct
            );
        } catch (IOException e) {
            log.error("Error saving file", e);
            return Map.of(
                "success", false,
                "error", "Failed to save image: " + e.getMessage()
            );
        }
    }

    @GetMapping("/api/admin/products")
    public List<Map<String, Object>> getAdminProducts() {
        return products;
    }
}
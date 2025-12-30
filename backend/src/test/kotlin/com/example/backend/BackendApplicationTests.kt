package com.example.backend

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class BackendApplicationTests {
	@Test
    @Disabled("Waiting for database configuration") // REMOVE THIS AFTER DATABASE IS ADDED
    fun contextLoads() {
    }
}

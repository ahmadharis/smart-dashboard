import {
  transformDataForCharts,
  getDataFiles,
  saveDataFile,
  deleteDataFile,
  DataPoint,
  DataFile
} from '../../../lib/data-utils'

// Mock the supabase client
jest.mock('../../../lib/supabase', () => ({
  createClient: () => mockSupabaseClient
}))

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis()
}

// Mock console.error to avoid noise in tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:30:00Z')
const originalDate = global.Date

describe('Data Utils Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
    global.Date = originalDate
  })

  describe('transformDataForCharts', () => {
    describe('JSON String Data', () => {
      it('should parse JSON array string data', () => {
        // Arrange
        const jsonString = JSON.stringify([
          { date: '2024-01-01', value: 100 },
          { date: '2024-01-02', value: 150 },
          { date: '2024-01-03', value: 200 }
        ])

        // Act
        const result = transformDataForCharts(jsonString)

        // Assert
        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
          date: '2024-01-01',
          value: 100
        })
        expect(result[2]).toEqual({
          date: '2024-01-03',
          value: 200
        })
      })

      it('should handle JSON with mixed date formats', () => {
        // Arrange
        const jsonString = JSON.stringify([
          { date: '01/15/2024', value: 100 },
          { date: '2024/01/16', value: 200 },
          { date: '2024-01-17', value: 300 }
        ])

        // Act
        const result = transformDataForCharts(jsonString)

        // Assert
        expect(result[0].date).toBe('2024-01-15')  // mm/dd/yyyy converted
        expect(result[1].date).toBe('2024-01-16')  // yyyy/mm/dd converted
        expect(result[2].date).toBe('2024-01-17')  // ISO format preserved
      })

      it('should handle JSON with string values that can be parsed as numbers', () => {
        // Arrange
        const jsonString = JSON.stringify([
          { date: '2024-01-01', value: '100.50' },
          { date: '2024-01-02', value: '250' },
          { date: '2024-01-03', value: 'invalid' }
        ])

        // Act
        const result = transformDataForCharts(jsonString)

        // Assert
        expect(result[0].value).toBe(100.50)
        expect(result[1].value).toBe(250)
        expect(result[2].value).toBe(0)  // Invalid number defaults to 0
      })

      it('should preserve additional fields from JSON data', () => {
        // Arrange
        const jsonString = JSON.stringify([
          {
            date: '2024-01-01',
            value: 100,
            category: 'Sales',
            region: 'North',
            active: true
          }
        ])

        // Act
        const result = transformDataForCharts(jsonString)

        // Assert
        expect(result[0]).toEqual({
          date: '2024-01-01',
          value: 100,
          category: 'Sales',
          region: 'North',
          active: true
        })
      })
    })

    describe('XML String Data', () => {
      it('should parse XML resultset data', () => {
        // Arrange
        const xmlString = `
          <resultset>
            <row>
              <date>2024-01-01</date>
              <value>100</value>
            </row>
            <row>
              <date>2024-01-02</date>
              <value>150</value>
            </row>
          </resultset>
        `

        // Act
        const result = transformDataForCharts(xmlString)

        // Assert
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          date: '2024-01-01',
          value: 100,
          originalDate: '2024-01-01',
          originalValue: '100'
        })
        expect(result[1]).toEqual({
          date: '2024-01-02',
          value: 150,
          originalDate: '2024-01-02',
          originalValue: '150'
        })
      })

      it('should handle XML with various date formats', () => {
        // Arrange
        const xmlString = `
          <resultset>
            <row>
              <date>01/15/2024</date>
              <value>100</value>
            </row>
            <row>
              <date>2024/01/16</date>
              <value>200</value>
            </row>
          </resultset>
        `

        // Act
        const result = transformDataForCharts(xmlString)

        // Assert
        expect(result[0].date).toBe('2024-01-15')
        expect(result[1].date).toBe('2024-01-16')
      })

      it('should handle XML with invalid or missing date/value', () => {
        // Arrange
        const xmlString = `
          <resultset>
            <row>
              <date>invalid-date</date>
              <value>100</value>
            </row>
            <row>
              <date>2024-01-01</date>
              <value>not-a-number</value>
            </row>
          </resultset>
        `

        // Act
        const result = transformDataForCharts(xmlString)

        // Assert
        expect(result[0].date).toBe('2024-01-15')  // Falls back to current date
        expect(result[1].value).toBe(0)  // Invalid number becomes 0
      })

      it('should handle XML with whitespace in date/value', () => {
        // Arrange
        const xmlString = `
          <resultset>
            <row>
              <date>  2024-01-01  </date>
              <value>  150.75  </value>
            </row>
          </resultset>
        `

        // Act
        const result = transformDataForCharts(xmlString)

        // Assert
        expect(result[0].date).toBe('2024-01-01')
        expect(result[0].value).toBe(150.75)
      })
    })

    describe('Array Data', () => {
      it('should transform array data with standard field names', () => {
        // Arrange
        const arrayData = [
          { date: '2024-01-01', value: 100 },
          { date: '2024-01-02', value: 200 }
        ]

        // Act
        const result = transformDataForCharts(arrayData)

        // Assert
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          date: '2024-01-01',
          value: 100
        })
        expect(result[1]).toEqual({
          date: '2024-01-02',
          value: 200
        })
      })

      it('should handle various field name variations', () => {
        // Arrange
        const arrayData = [
          { Date: '2024-01-01', Value: 100 },
          { DATE: '2024-01-02', amount: 200 },
          { timestamp: '2024-01-03', count: 300 },
          { created_at: '2024-01-04', total: 400 },
          { time: '2024-01-05', quantity: 500 }
        ]

        // Act
        const result = transformDataForCharts(arrayData)

        // Assert
        expect(result[0].date).toBe('2024-01-01')
        expect(result[0].value).toBe(100)
        expect(result[1].value).toBe(200)  // amount field
        expect(result[2].value).toBe(300)  // count field
        expect(result[3].value).toBe(400)  // total field
        expect(result[4].value).toBe(500)  // quantity field
      })

      it('should handle missing date/value fields with defaults', () => {
        // Arrange
        const arrayData = [
          { name: 'Item 1' },
          { description: 'Item 2' },
          { category: 'Item 3' }
        ]

        // Act
        const result = transformDataForCharts(arrayData)

        // Assert
        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
          date: '2024-01-15',  // Current date fallback
          value: 1,            // Index + 1 fallback
          name: 'Item 1'
        })
        expect(result[1]).toEqual({
          date: '2024-01-15',
          value: 2,
          description: 'Item 2'
        })
        expect(result[2]).toEqual({
          date: '2024-01-15',
          value: 3,
          category: 'Item 3'
        })
      })

      it('should preserve all original fields', () => {
        // Arrange
        const arrayData = [
          {
            date: '2024-01-01',
            value: 100,
            category: 'Sales',
            region: 'North',
            active: true,
            metadata: { source: 'API' }
          }
        ]

        // Act
        const result = transformDataForCharts(arrayData)

        // Assert
        expect(result[0]).toEqual({
          date: '2024-01-01',
          value: 100,
          category: 'Sales',
          region: 'North',
          active: true,
          metadata: { source: 'API' }
        })
      })

      it('should handle numeric and string value conversion', () => {
        // Arrange
        const arrayData = [
          { date: '2024-01-01', value: 100 },          // Already number
          { date: '2024-01-02', value: '200.5' },      // String number
          { date: '2024-01-03', value: 'invalid' },    // Invalid string
          { date: '2024-01-04', price: '45.99' }       // Alternative field
        ]

        // Act
        const result = transformDataForCharts(arrayData)

        // Assert
        expect(result[0].value).toBe(100)
        expect(result[1].value).toBe(200.5)
        expect(result[2].value).toBe(3)      // Index + 1 fallback
        expect(result[3].value).toBe(45.99)  // price field parsed
      })
    })

    describe('Edge Cases and Error Handling', () => {
      it('should return empty array for non-array, non-string input', () => {
        // Act & Assert
        expect(transformDataForCharts(null)).toEqual([])
        expect(transformDataForCharts(undefined)).toEqual([])
        expect(transformDataForCharts(123)).toEqual([])
        expect(transformDataForCharts({})).toEqual([])
        expect(transformDataForCharts(true)).toEqual([])
      })

      it('should handle invalid JSON string gracefully', () => {
        // Arrange
        const invalidJSON = '{ invalid json string'

        // Act
        const result = transformDataForCharts(invalidJSON)

        // Assert
        expect(result).toEqual([])
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing string data:', expect.any(SyntaxError))
      })

      it('should handle malformed XML gracefully', () => {
        // Arrange
        const malformedXML = '<resultset><row><date>2024-01-01<value>100</value></row></resultset>'

        // Act
        const result = transformDataForCharts(malformedXML)

        // Assert
        expect(result).toEqual([])  // Should not crash, returns empty array
      })

      it('should handle empty string input', () => {
        // Act
        const result = transformDataForCharts('')

        // Assert
        expect(result).toEqual([])
      })

      it('should handle string that looks like JSON but isn\'t', () => {
        // Arrange
        const notReallyJSON = 'This looks like [data] but {is not} JSON'

        // Act
        const result = transformDataForCharts(notReallyJSON)

        // Assert
        expect(result).toEqual([])
      })

      it('should handle deeply nested JSON objects', () => {
        // Arrange
        const nestedJSON = JSON.stringify([
          {
            date: '2024-01-01',
            value: 100,
            metadata: {
              source: 'api',
              nested: {
                deep: 'value'
              }
            }
          }
        ])

        // Act
        const result = transformDataForCharts(nestedJSON)

        // Assert
        expect(result[0].metadata.nested.deep).toBe('value')
      })
    })

    describe('Date Normalization', () => {
      it('should handle various date formats correctly', () => {
        // Arrange
        const dateFormats = [
          { input: '1/5/2024', expected: '2024-01-05' },
          { input: '12/25/2024', expected: '2024-12-25' },
          { input: '2024/1/5', expected: '2024-01-05' },
          { input: '2024/12/25', expected: '2024-12-25' },
          { input: '2024-01-15', expected: '2024-01-15' },
          { input: 'Jan 15, 2024', expected: '2024-01-15' },
          { input: '2024-01-15T10:30:00Z', expected: '2024-01-15' }
        ]

        // Act & Assert
        dateFormats.forEach(({ input, expected }) => {
          const arrayData = [{ date: input, value: 100 }]
          const result = transformDataForCharts(arrayData)
          expect(result[0].date).toBe(expected)
        })
      })

      it('should handle invalid dates with fallback', () => {
        // Arrange
        const invalidDates = [
          'invalid-date',
          '13/32/2024',  // Invalid month/day
          '2024-13-45',  // Invalid month/day
          '',
          null,
          undefined,
          'not a date at all'
        ]

        // Act & Assert
        invalidDates.forEach(invalidDate => {
          const arrayData = [{ date: invalidDate, value: 100 }]
          const result = transformDataForCharts(arrayData)
          expect(result[0].date).toBe('2024-01-15')  // Current date fallback
        })
      })
    })
  })

  // =================================================================
  // PHASE 2 TESTS - DATABASE DEPENDENT (Skip in Phase 1)
  // =================================================================
  describe.skip('getDataFiles', () => {
    beforeEach(() => {
      // Reset the mock chain
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    })

    describe('Happy Path', () => {
      it('should fetch data files for tenant without dashboard filter', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        const mockData = [
          {
            id: 'file-1',
            filename: 'sales-data.xml',
            data_type: 'Sales Data',
            json_data: [{ date: '2024-01-01', value: 100 }],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            chart_type: 'line',
            dashboard_id: 'dash-1',
            sort_order: 1,
            tenant_id: 'tenant-123',
            field_order: ['date', 'value']
          }
        ]

        mockSupabaseClient.order.mockResolvedValue({ data: mockData, error: null })

        // Act
        const result = await getDataFiles(tenantId)

        // Assert
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('data_files')
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', tenantId)
        expect(mockSupabaseClient.order).toHaveBeenCalledWith('sort_order', { ascending: true })
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          id: 'file-1',
          name: 'sales-data.xml',
          type: 'Sales Data',
          data: [{ date: '2024-01-01', value: 100 }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          chart_type: 'line',
          dashboard_id: 'dash-1',
          sort_order: 1,
          tenant_id: 'tenant-123',
          field_order: ['date', 'value']
        })
      })

      it('should fetch data files filtered by dashboard', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        const dashboardId = 'dash-1'
        const mockData = []

        mockSupabaseClient.order.mockResolvedValue({ data: mockData, error: null })

        // Act
        await getDataFiles(tenantId, dashboardId)

        // Assert
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', tenantId)
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('dashboard_id', dashboardId)
      })

      it('should handle missing optional fields with defaults', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        const mockData = [
          {
            id: 'file-1',
            filename: 'test.xml',
            data_type: 'Test Data',
            json_data: [],
            created_at: '2024-01-01T00:00:00Z',
            // missing optional fields
            tenant_id: 'tenant-123'
          }
        ]

        mockSupabaseClient.order.mockResolvedValue({ data: mockData, error: null })

        // Act
        const result = await getDataFiles(tenantId)

        // Assert
        expect(result[0]).toEqual({
          id: 'file-1',
          name: 'test.xml',
          type: 'Test Data',
          data: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',  // Falls back to created_at
          chart_type: 'line',                   // Default value
          dashboard_id: undefined,
          sort_order: 0,                        // Default value
          tenant_id: 'tenant-123',
          field_order: undefined
        })
      })
    })

    describe('Error Handling', () => {
      it('should handle database error gracefully', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        mockSupabaseClient.order.mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })

        // Act
        const result = await getDataFiles(tenantId)

        // Assert
        expect(result).toEqual([])
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching data files:', expect.any(Object))
      })

      it('should handle null data response', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        mockSupabaseClient.order.mockResolvedValue({ data: null, error: null })

        // Act
        const result = await getDataFiles(tenantId)

        // Assert
        expect(result).toEqual([])
      })

      it('should handle exception during execution', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        mockSupabaseClient.from.mockImplementation(() => {
          throw new Error('Supabase client error')
        })

        // Act
        const result = await getDataFiles(tenantId)

        // Assert
        expect(result).toEqual([])
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in getDataFiles:', expect.any(Error))
      })
    })
  })

  describe.skip('saveDataFile', () => {
    beforeEach(() => {
      // Reset all mocks
      Object.keys(mockSupabaseClient).forEach(key => {
        mockSupabaseClient[key].mockReturnValue(mockSupabaseClient)
      })
    })

    describe('Happy Path - New File', () => {
      it('should create new data file successfully', async () => {
        // Arrange
        const filename = 'test-data.xml'
        const dataType = 'Test Data'
        const jsonData = [{ date: '2024-01-01', value: 100 }]
        const tenantId = 'tenant-123'
        const dashboardId = 'dash-1'
        const fieldOrder = ['date', 'value']

        // Mock check for existing file (not found)
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'not found' }
        })

        // Mock sort order query
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { sort_order: 5 },
          error: null
        })

        // Mock successful insert
        mockSupabaseClient.insert.mockResolvedValueOnce({
          error: null
        })

        // Act
        const result = await saveDataFile(filename, dataType, jsonData, tenantId, dashboardId, undefined, fieldOrder)

        // Assert
        expect(result).toEqual({
          success: true,
          dashboard_id: dashboardId
        })
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
          tenant_id: tenantId,
          filename,
          data_type: dataType,
          json_data: jsonData,
          dashboard_id: dashboardId,
          sort_order: 6,
          created_at: expect.any(String),
          updated_at: expect.any(String),
          field_order: fieldOrder
        })
      })

      it('should create new dashboard when title provided but no dashboard ID', async () => {
        // Arrange
        const filename = 'test.xml'
        const dataType = 'Test'
        const jsonData = []
        const tenantId = 'tenant-123'
        const dashboardTitle = 'New Dashboard'

        // Mock dashboard sort order query
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { sort_order: 2 },
          error: null
        })

        // Mock dashboard creation
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { id: 'new-dash-id' },
          error: null
        })

        // Mock file existence check
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        // Mock data file sort order
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: null
        })

        // Mock file insert
        mockSupabaseClient.insert.mockResolvedValue({ error: null })

        // Act
        const result = await saveDataFile(filename, dataType, jsonData, tenantId, undefined, dashboardTitle)

        // Assert
        expect(result).toEqual({
          success: true,
          dashboard_id: 'new-dash-id'
        })
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
          tenant_id: tenantId,
          title: dashboardTitle,
          sort_order: 3,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        })
      })
    })

    describe('Happy Path - Update Existing File', () => {
      it('should update existing data file', async () => {
        // Arrange
        const filename = 'existing.xml'
        const dataType = 'Existing Data'
        const jsonData = [{ date: '2024-01-02', value: 200 }]
        const tenantId = 'tenant-123'
        const dashboardId = 'dash-1'
        const fieldOrder = ['date', 'value', 'category']

        // Mock existing file found
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { id: 'existing-file-id' },
          error: null
        })

        // Mock successful update
        mockSupabaseClient.update.mockResolvedValueOnce({
          error: null
        })

        // Act
        const result = await saveDataFile(filename, dataType, jsonData, tenantId, dashboardId, undefined, fieldOrder)

        // Assert
        expect(result).toEqual({
          success: true,
          dashboard_id: dashboardId
        })
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({
          json_data: jsonData,
          updated_at: expect.any(String),
          field_order: fieldOrder
        })
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'existing-file-id')
      })

      it('should update existing file without field order', async () => {
        // Arrange
        const filename = 'existing.xml'
        const dataType = 'Existing Data'
        const jsonData = [{ date: '2024-01-02', value: 200 }]
        const tenantId = 'tenant-123'
        const dashboardId = 'dash-1'

        // Mock existing file found
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { id: 'existing-file-id' },
          error: null
        })

        // Mock successful update
        mockSupabaseClient.update.mockResolvedValueOnce({
          error: null
        })

        // Act
        const result = await saveDataFile(filename, dataType, jsonData, tenantId, dashboardId)

        // Assert
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({
          json_data: jsonData,
          updated_at: expect.any(String)
          // field_order should not be included
        })
      })
    })

    describe('Error Handling', () => {
      it('should return false when no dashboard ID provided and no title', async () => {
        // Act
        const result = await saveDataFile('test.xml', 'Test', [], 'tenant-123')

        // Assert
        expect(result).toBe(false)
      })

      it('should handle dashboard creation error', async () => {
        // Arrange
        const tenantId = 'tenant-123'
        const dashboardTitle = 'New Dashboard'

        // Mock dashboard sort order query
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { sort_order: 1 },
          error: null
        })

        // Mock dashboard creation error
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Dashboard creation failed' }
        })

        // Act
        const result = await saveDataFile('test.xml', 'Test', [], tenantId, undefined, dashboardTitle)

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating dashboard:', expect.any(Object))
      })

      it('should handle file existence check error', async () => {
        // Arrange
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'SOME_OTHER_ERROR', message: 'Database error' }
        })

        // Act
        const result = await saveDataFile('test.xml', 'Test', [], 'tenant-123', 'dash-1')

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking existing data file:', expect.any(Object))
      })

      it('should handle file update error', async () => {
        // Arrange
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { id: 'file-id' },
          error: null
        })

        mockSupabaseClient.update.mockResolvedValueOnce({
          error: { message: 'Update failed' }
        })

        // Act
        const result = await saveDataFile('test.xml', 'Test', [], 'tenant-123', 'dash-1')

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating data file:', expect.any(Object))
      })

      it('should handle file insert error', async () => {
        // Arrange
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { sort_order: 1 },
          error: null
        })

        mockSupabaseClient.insert.mockResolvedValueOnce({
          error: { message: 'Insert failed' }
        })

        // Act
        const result = await saveDataFile('test.xml', 'Test', [], 'tenant-123', 'dash-1')

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error inserting data file:', expect.any(Object))
      })

      it('should handle exception during execution', async () => {
        // Arrange
        mockSupabaseClient.from.mockImplementation(() => {
          throw new Error('Supabase error')
        })

        // Act
        const result = await saveDataFile('test.xml', 'Test', [], 'tenant-123', 'dash-1')

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in saveDataFile:', expect.any(Error))
      })
    })
  })

  describe.skip('deleteDataFile', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    })

    describe('Happy Path', () => {
      it('should delete data file successfully', async () => {
        // Arrange
        const filename = 'test-file.xml'
        const tenantId = 'tenant-123'
        
        mockSupabaseClient.eq.mockResolvedValueOnce({
          error: null
        })

        // Act
        const result = await deleteDataFile(filename, tenantId)

        // Assert
        expect(result).toBe(true)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('data_files')
        expect(mockSupabaseClient.delete).toHaveBeenCalled()
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('filename', filename)
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', tenantId)
      })
    })

    describe('Error Handling', () => {
      it('should handle delete error gracefully', async () => {
        // Arrange
        const filename = 'test-file.xml'
        const tenantId = 'tenant-123'
        
        mockSupabaseClient.eq.mockResolvedValueOnce({
          error: { message: 'Delete failed' }
        })

        // Act
        const result = await deleteDataFile(filename, tenantId)

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting data file:', expect.any(Object))
      })

      it('should handle exception during execution', async () => {
        // Arrange
        const filename = 'test-file.xml'
        const tenantId = 'tenant-123'
        
        mockSupabaseClient.from.mockImplementation(() => {
          throw new Error('Supabase error')
        })

        // Act
        const result = await deleteDataFile(filename, tenantId)

        // Assert
        expect(result).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in deleteDataFile:', expect.any(Error))
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete data pipeline flow', () => {
      // Arrange
      const rawXMLString = `
        <resultset>
          <row>
            <date>01/15/2024</date>
            <value>1250.75</value>
          </row>
          <row>
            <date>01/16/2024</date>
            <value>1890.25</value>
          </row>
        </resultset>
      `

      // Act
      const transformedData = transformDataForCharts(rawXMLString)

      // Assert
      expect(transformedData).toHaveLength(2)
      expect(transformedData[0]).toEqual({
        date: '2024-01-15',
        value: 1250.75,
        originalDate: '01/15/2024',
        originalValue: '1250.75'
      })
      expect(transformedData[1]).toEqual({
        date: '2024-01-16',
        value: 1890.25,
        originalDate: '01/16/2024',
        originalValue: '1890.25'
      })
    })

    it('should handle mixed data format transformations', () => {
      // Arrange
      const jsonArray = [
        { timestamp: '2024-01-01T10:00:00Z', amount: 100, category: 'A' },
        { created_at: '01/02/2024', total: '250.50', region: 'North' },
        { Date: '2024/01/03', Value: 300, active: true }
      ]

      // Act
      const result = transformDataForCharts(jsonArray)

      // Assert
      expect(result).toHaveLength(3)
      expect(result[0].date).toBe('2024-01-01')
      expect(result[0].value).toBe(100)
      expect(result[0].category).toBe('A')
      
      expect(result[1].date).toBe('2024-01-02')
      expect(result[1].value).toBe(250.50)
      expect(result[1].region).toBe('North')
      
      expect(result[2].date).toBe('2024-01-03')
      expect(result[2].value).toBe(300)
      expect(result[2].active).toBe(true)
    })

    it('should handle edge case data with security considerations', () => {
      // Arrange
      const maliciousJSON = JSON.stringify([
        {
          date: '2024-01-01',
          value: 100,
          script: '<script>alert("xss")</script>',
          sql: "'; DROP TABLE users; --",
          path: '../../etc/passwd'
        }
      ])

      // Act
      const result = transformDataForCharts(maliciousJSON)

      // Assert
      expect(result[0]).toEqual({
        date: '2024-01-01',
        value: 100,
        script: '<script>alert("xss")</script>',  // Preserved as data, not executed
        sql: "'; DROP TABLE users; --",           // Preserved as data, not executed
        path: '../../etc/passwd'                  // Preserved as data, not executed
      })
      // The data transformation doesn't sanitize - that should happen at display/storage level
    })
  })
})
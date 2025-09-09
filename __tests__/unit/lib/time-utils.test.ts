import { formatRelativeTime } from '../../../lib/time-utils'

describe('Time Utils Module', () => {
  // Mock Date for consistent testing
  const mockNow = new Date('2024-01-15T12:00:00Z')
  const originalDate = Date
  
  beforeEach(() => {
    // Use jest.spyOn for safer Date mocking
    const mockDateConstructor = (...args: any[]) => {
      if (args.length === 0) {
        return mockNow
      }
      return new originalDate(...args)
    }
    jest.spyOn(global, 'Date').mockImplementation(mockDateConstructor as any)
    
    // Mock Date.now separately
    jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('formatRelativeTime', () => {
    describe('Edge Cases', () => {
      it('should return "Unknown" for empty string', () => {
        // Act
        const result = formatRelativeTime('')

        // Assert
        expect(result).toBe('Unknown')
      })

      it('should return "Unknown" for null input', () => {
        // Act
        const result = formatRelativeTime(null as any)

        // Assert
        expect(result).toBe('Unknown')
      })

      it('should return "Unknown" for undefined input', () => {
        // Act
        const result = formatRelativeTime(undefined as any)

        // Assert
        expect(result).toBe('Unknown')
      })

      it('should return "Unknown" for invalid date string', () => {
        // Arrange
        const invalidDates = [
          'not-a-date',
          'invalid-date-string',
          '2024-13-45',  // Invalid month/day
          '13/32/2024',  // Invalid month/day
          'abc-def-ghi',
          '2024-01-01T25:00:00Z', // Invalid hour
        ]

        // Act & Assert
        invalidDates.forEach(invalidDate => {
          const result = formatRelativeTime(invalidDate)
          expect(result).toBe('Unknown')
        })
      })
    })

    describe('Recent Times - "just now"', () => {
      it('should return "just now" for current time', () => {
        // Arrange
        const currentTime = '2024-01-15T12:00:00Z'

        // Act
        const result = formatRelativeTime(currentTime)

        // Assert
        expect(result).toBe('just now')
      })

      it('should return "just now" for 30 seconds ago', () => {
        // Arrange
        const thirtySecondsAgo = '2024-01-15T11:59:30Z'

        // Act
        const result = formatRelativeTime(thirtySecondsAgo)

        // Assert
        expect(result).toBe('just now')
      })

      it('should return "just now" for 59 seconds ago', () => {
        // Arrange
        const fiftyNineSecondsAgo = '2024-01-15T11:59:01Z'

        // Act
        const result = formatRelativeTime(fiftyNineSecondsAgo)

        // Assert
        expect(result).toBe('just now')
      })

      it('should return "just now" for exactly 59 seconds ago', () => {
        // Arrange
        const exactlyFiftyNineSecondsAgo = '2024-01-15T11:59:01.000Z'

        // Act
        const result = formatRelativeTime(exactlyFiftyNineSecondsAgo)

        // Assert
        expect(result).toBe('just now')
      })
    })

    describe('Minutes Ago', () => {
      it('should return "1 minute ago" for exactly 1 minute ago', () => {
        // Arrange
        const oneMinuteAgo = '2024-01-15T11:59:00Z'

        // Act
        const result = formatRelativeTime(oneMinuteAgo)

        // Assert
        expect(result).toBe('1 minute ago')
      })

      it('should return "5 minutes ago" for 5 minutes ago', () => {
        // Arrange
        const fiveMinutesAgo = '2024-01-15T11:55:00Z'

        // Act
        const result = formatRelativeTime(fiveMinutesAgo)

        // Assert
        expect(result).toBe('5 minutes ago')
      })

      it('should return "30 minutes ago" for 30 minutes ago', () => {
        // Arrange
        const thirtyMinutesAgo = '2024-01-15T11:30:00Z'

        // Act
        const result = formatRelativeTime(thirtyMinutesAgo)

        // Assert
        expect(result).toBe('30 minutes ago')
      })

      it('should return "59 minutes ago" for 59 minutes ago', () => {
        // Arrange
        const fiftyNineMinutesAgo = '2024-01-15T11:01:00Z'

        // Act
        const result = formatRelativeTime(fiftyNineMinutesAgo)

        // Assert
        expect(result).toBe('59 minutes ago')
      })

      it('should use singular form for exactly 1 minute', () => {
        // Arrange
        const oneMinuteAgo = '2024-01-15T11:59:00Z'

        // Act
        const result = formatRelativeTime(oneMinuteAgo)

        // Assert
        expect(result).toBe('1 minute ago')
        expect(result).not.toContain('minutes')
      })

      it('should use plural form for multiple minutes', () => {
        // Arrange
        const twoMinutesAgo = '2024-01-15T11:58:00Z'

        // Act
        const result = formatRelativeTime(twoMinutesAgo)

        // Assert
        expect(result).toBe('2 minutes ago')
        expect(result).toContain('minutes')
      })
    })

    describe('Hours Ago', () => {
      it('should return "1 hour ago" for exactly 1 hour ago', () => {
        // Arrange
        const oneHourAgo = '2024-01-15T11:00:00Z'

        // Act
        const result = formatRelativeTime(oneHourAgo)

        // Assert
        expect(result).toBe('1 hour ago')
      })

      it('should return "2 hours ago" for 2 hours ago', () => {
        // Arrange
        const twoHoursAgo = '2024-01-15T10:00:00Z'

        // Act
        const result = formatRelativeTime(twoHoursAgo)

        // Assert
        expect(result).toBe('2 hours ago')
      })

      it('should return "12 hours ago" for 12 hours ago', () => {
        // Arrange
        const twelveHoursAgo = '2024-01-15T00:00:00Z'

        // Act
        const result = formatRelativeTime(twelveHoursAgo)

        // Assert
        expect(result).toBe('12 hours ago')
      })

      it('should return "23 hours ago" for 23 hours ago', () => {
        // Arrange
        const twentyThreeHoursAgo = '2024-01-14T13:00:00Z'

        // Act
        const result = formatRelativeTime(twentyThreeHoursAgo)

        // Assert
        expect(result).toBe('23 hours ago')
      })

      it('should use singular form for exactly 1 hour', () => {
        // Arrange
        const oneHourAgo = '2024-01-15T11:00:00Z'

        // Act
        const result = formatRelativeTime(oneHourAgo)

        // Assert
        expect(result).toBe('1 hour ago')
        expect(result).not.toContain('hours')
      })

      it('should use plural form for multiple hours', () => {
        // Arrange
        const threeHoursAgo = '2024-01-15T09:00:00Z'

        // Act
        const result = formatRelativeTime(threeHoursAgo)

        // Assert
        expect(result).toBe('3 hours ago')
        expect(result).toContain('hours')
      })
    })

    describe('Days Ago (Within a Week)', () => {
      it('should return "1 day ago" for exactly 1 day ago', () => {
        // Arrange
        const oneDayAgo = '2024-01-14T12:00:00Z'

        // Act
        const result = formatRelativeTime(oneDayAgo)

        // Assert
        expect(result).toBe('1 day ago')
      })

      it('should return "2 days ago" for 2 days ago', () => {
        // Arrange
        const twoDaysAgo = '2024-01-13T12:00:00Z'

        // Act
        const result = formatRelativeTime(twoDaysAgo)

        // Assert
        expect(result).toBe('2 days ago')
      })

      it('should return "7 days ago" for exactly 7 days ago', () => {
        // Arrange
        const sevenDaysAgo = '2024-01-08T12:00:00Z'

        // Act
        const result = formatRelativeTime(sevenDaysAgo)

        // Assert
        expect(result).toBe('7 days ago')
      })

      it('should use singular form for exactly 1 day', () => {
        // Arrange
        const oneDayAgo = '2024-01-14T12:00:00Z'

        // Act
        const result = formatRelativeTime(oneDayAgo)

        // Assert
        expect(result).toBe('1 day ago')
        expect(result).not.toContain('days')
      })

      it('should use plural form for multiple days', () => {
        // Arrange
        const threeDaysAgo = '2024-01-12T12:00:00Z'

        // Act
        const result = formatRelativeTime(threeDaysAgo)

        // Assert
        expect(result).toBe('3 days ago')
        expect(result).toContain('days')
      })
    })

    describe('Full Date Format (More than 7 Days)', () => {
      it('should return full date for 8 days ago', () => {
        // Arrange
        const eightDaysAgo = '2024-01-07T12:00:00Z'

        // Act
        const result = formatRelativeTime(eightDaysAgo)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        expect(result).toContain('at')
      })

      it('should return full date for 1 month ago', () => {
        // Arrange
        const oneMonthAgo = '2023-12-15T12:00:00Z'

        // Act
        const result = formatRelativeTime(oneMonthAgo)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        expect(result).toContain('2023')
      })

      it('should return full date for 1 year ago', () => {
        // Arrange
        const oneYearAgo = '2023-01-15T12:00:00Z'

        // Act
        const result = formatRelativeTime(oneYearAgo)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        expect(result).toContain('2023')
      })

      it('should include both date and time for old dates', () => {
        // Arrange
        const oldDate = '2023-06-10T15:30:45Z'

        // Act
        const result = formatRelativeTime(oldDate)

        // Assert
        expect(result).toContain('at')
        expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/) // Time format
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // Date format
      })
    })

    describe('Edge Cases - Boundary Testing', () => {
      it('should handle exactly 60 seconds (1 minute boundary)', () => {
        // Arrange
        const exactlyOneMinute = '2024-01-15T11:59:00.000Z'

        // Act
        const result = formatRelativeTime(exactlyOneMinute)

        // Assert
        expect(result).toBe('1 minute ago')
      })

      it('should handle exactly 3600 seconds (1 hour boundary)', () => {
        // Arrange
        const exactlyOneHour = '2024-01-15T11:00:00.000Z'

        // Act
        const result = formatRelativeTime(exactlyOneHour)

        // Assert
        expect(result).toBe('1 hour ago')
      })

      it('should handle exactly 86400 seconds (1 day boundary)', () => {
        // Arrange
        const exactlyOneDay = '2024-01-14T12:00:00.000Z'

        // Act
        const result = formatRelativeTime(exactlyOneDay)

        // Assert
        expect(result).toBe('1 day ago')
      })

      it('should handle exactly 7 days boundary', () => {
        // Arrange
        const exactlySevenDays = '2024-01-08T12:00:00.000Z'

        // Act
        const result = formatRelativeTime(exactlySevenDays)

        // Assert
        expect(result).toBe('7 days ago')
      })

      it('should handle 7 days + 1 second (switches to full date)', () => {
        // Arrange
        const moreThanSevenDays = '2024-01-08T11:59:59.000Z'

        // Act
        const result = formatRelativeTime(moreThanSevenDays)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
      })
    })

    describe('Different Date String Formats', () => {
      it('should handle ISO 8601 format', () => {
        // Arrange
        const isoDate = '2024-01-15T11:30:00.000Z'

        // Act
        const result = formatRelativeTime(isoDate)

        // Assert
        expect(result).toBe('30 minutes ago')
      })

      it('should handle ISO format without milliseconds', () => {
        // Arrange
        const isoDate = '2024-01-15T11:30:00Z'

        // Act
        const result = formatRelativeTime(isoDate)

        // Assert
        expect(result).toBe('30 minutes ago')
      })

      it('should handle ISO format with timezone offset', () => {
        // Arrange
        const isoDateWithOffset = '2024-01-15T07:30:00-05:00' // EST, which is 12:30 UTC

        // Act
        const result = formatRelativeTime(isoDateWithOffset)

        // Assert
        expect(result).toBe('30 minutes ago')
      })

      it('should handle date string without time', () => {
        // Arrange
        const dateOnly = '2024-01-15'

        // Act
        const result = formatRelativeTime(dateOnly)

        // Assert
        expect(result).toBe('12 hours ago') // Assuming date defaults to midnight UTC
      })

      it('should handle various standard date formats', () => {
        // Arrange
        const formats = [
          'Mon Jan 15 2024 11:30:00 GMT+0000 (UTC)',
          '2024-01-15 11:30:00',
          'January 15, 2024 11:30:00',
          '01/15/2024 11:30:00'
        ]

        // Act & Assert
        formats.forEach(dateString => {
          const result = formatRelativeTime(dateString)
          expect(result).not.toBe('Unknown')
        })
      })
    })

    describe('Future Dates', () => {
      it('should handle future dates as negative relative time', () => {
        // Arrange
        const futureDate = '2024-01-15T13:00:00Z' // 1 hour in the future

        // Act
        const result = formatRelativeTime(futureDate)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
      })

      it('should handle far future dates', () => {
        // Arrange
        const farFuture = '2025-01-15T12:00:00Z'

        // Act
        const result = formatRelativeTime(farFuture)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        expect(result).toContain('2025')
      })
    })

    describe('Precision and Rounding', () => {
      it('should floor minutes correctly', () => {
        // Arrange
        const oneMinuteFiftyNineSeconds = '2024-01-15T11:58:01Z'

        // Act
        const result = formatRelativeTime(oneMinuteFiftyNineSeconds)

        // Assert
        expect(result).toBe('1 minute ago') // Should floor to 1, not round to 2
      })

      it('should floor hours correctly', () => {
        // Arrange
        const oneHourFiftyNineMinutes = '2024-01-15T10:01:00Z'

        // Act
        const result = formatRelativeTime(oneHourFiftyNineMinutes)

        // Assert
        expect(result).toBe('1 hour ago') // Should floor to 1, not round to 2
      })

      it('should floor days correctly', () => {
        // Arrange
        const oneDayTwentyThreeHours = '2024-01-13T13:00:00Z' // 1 day 23 hours ago

        // Act
        const result = formatRelativeTime(oneDayTwentyThreeHours)

        // Assert
        expect(result).toBe('1 day ago') // Should floor to 1, not round to 2
      })
    })

    describe('Locale and Formatting', () => {
      it('should format full dates using locale settings', () => {
        // Arrange
        const oldDate = '2023-12-25T18:30:45Z'

        // Act
        const result = formatRelativeTime(oldDate)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        // The exact format depends on the system locale, but should contain date and time
      })

      it('should handle dates consistently regardless of system locale', () => {
        // Arrange
        const testDates = [
          '2023-01-01T12:00:00Z',
          '2023-06-15T12:00:00Z',
          '2023-12-31T12:00:00Z'
        ]

        // Act & Assert
        testDates.forEach(dateString => {
          const result = formatRelativeTime(dateString)
          expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        })
      })
    })

    describe('Performance and Edge Cases', () => {
      it('should handle very old dates without performance issues', () => {
        // Arrange
        const veryOldDate = '1970-01-01T00:00:00Z'

        // Act
        const startTime = performance.now()
        const result = formatRelativeTime(veryOldDate)
        const endTime = performance.now()

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
        expect(endTime - startTime).toBeLessThan(10) // Should complete in less than 10ms
      })

      it('should handle maximum date values', () => {
        // Arrange
        const maxDate = new Date(8640000000000000).toISOString() // Max safe date

        // Act
        const result = formatRelativeTime(maxDate)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
      })

      it('should handle minimum date values', () => {
        // Arrange
        const minDate = new Date(-8640000000000000).toISOString() // Min safe date

        // Act
        const result = formatRelativeTime(minDate)

        // Assert
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/)
      })
    })

    describe('Real-world Usage Scenarios', () => {
      it('should handle typical database timestamp format', () => {
        // Arrange
        const dbTimestamp = '2024-01-15 11:45:30.123456'

        // Act
        const result = formatRelativeTime(dbTimestamp)

        // Assert
        expect(result).toBe('15 minutes ago')
      })

      it('should handle API response date format', () => {
        // Arrange
        const apiDate = '2024-01-15T11:55:00.000Z'

        // Act
        const result = formatRelativeTime(apiDate)

        // Assert
        expect(result).toBe('5 minutes ago')
      })

      it('should handle file modification timestamp', () => {
        // Arrange
        const fileTimestamp = 'Mon Jan 15 2024 11:30:00 GMT+0000'

        // Act
        const result = formatRelativeTime(fileTimestamp)

        // Assert
        expect(result).toBe('30 minutes ago')
      })

      it('should handle user input date scenarios', () => {
        // Arrange
        const userInputs = [
          '2024-01-15T10:00:00Z',    // 2 hours ago
          '2024-01-14T12:00:00Z',    // 1 day ago
          '2024-01-13T12:00:00Z',    // 2 days ago
          '2024-01-08T12:00:00Z',    // 7 days ago
          '2024-01-07T12:00:00Z'     // 8 days ago (full format)
        ]

        const expectedResults = [
          '2 hours ago',
          '1 day ago',
          '2 days ago',
          '7 days ago',
          /\d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/
        ]

        // Act & Assert
        userInputs.forEach((input, index) => {
          const result = formatRelativeTime(input)
          if (typeof expectedResults[index] === 'string') {
            expect(result).toBe(expectedResults[index])
          } else {
            expect(result).toMatch(expectedResults[index] as RegExp)
          }
        })
      })
    })
  })
})
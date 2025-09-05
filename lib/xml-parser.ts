import { XMLParser } from "fast-xml-parser"

export interface ParsedXMLData {
  data: any[]
  fieldOrder: string[] // Added field order to return interface
  message: string
}

export function parseXMLToJSON(xmlContent: string, dataType?: string): ParsedXMLData {
  try {
    if (!xmlContent || typeof xmlContent !== "string") {
      throw new Error("Invalid XML content provided")
    }

    if (xmlContent.length > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error("XML content too large (max 10MB)")
    }

    const sanitizedXML = xmlContent
      .replace(/<!DOCTYPE[^>]*>/gi, "") // Remove DOCTYPE declarations
      .replace(/<!ENTITY[^>]*>/gi, "") // Remove entity declarations
      .replace(/&[^;]+;/g, "") // Remove all entity references
      .replace(/<\?xml[^>]*\?>/gi, "") // Remove XML processing instructions
      .replace(/<!--[\s\S]*?-->/g, "") // Remove comments

    const fieldOrderMatch = sanitizedXML.match(/<row[^>]*>(.*?)<\/row>/s)
    if (!fieldOrderMatch) {
      throw new Error("No row found in XML to determine field order")
    }

    const firstRowContent = fieldOrderMatch[1]

    const fieldNames: string[] = []
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g
    let match
    let matchCount = 0
    while ((match = fieldRegex.exec(firstRowContent)) !== null && matchCount < 100) {
      fieldNames.push(match[1])
      matchCount++
    }

    if (fieldNames.length === 0) {
      throw new Error("No fields found in first row")
    }

    const parser = new XMLParser({
      ignoreAttributes: true,
      removeNSPrefix: true,
      processEntities: false, // Prevent entity processing
      allowBooleanAttributes: false, // Disable boolean attributes
      parseTagValue: false, // Prevent script execution
      trimValues: true,
      parseTrueNumberOnly: true,
      parseAttributeValue: false, // Disable attribute parsing
      ignoreDeclaration: true, // Ignore XML declarations
      ignorePiTags: true, // Ignore processing instructions
      stopNodes: ["script", "style"], // Block dangerous tags
      isArray: () => false, // Prevent array confusion attacks
    })

    const result = parser.parse(sanitizedXML)

    if (!result || !result.resultset) {
      throw new Error("No resultset found in XML")
    }

    const resultset = result.resultset
    if (!resultset.row) {
      throw new Error("No rows found in resultset")
    }

    // Ensure rows is an array
    const rows = Array.isArray(resultset.row) ? resultset.row : [resultset.row]

    if (rows.length === 0) {
      throw new Error("No rows found in resultset")
    }

    const transformedData = rows.map((row: any) => {
      // Create ordered array of [key, value] pairs to preserve field order
      const orderedPairs = fieldNames.map((fieldName) => {
        const value = row[fieldName]
        const stringValue = String(value || "").trim()

        if (fieldNames.indexOf(fieldName) === 0) {
          // First column stays as string (key column)
          return [fieldName, stringValue]
        } else {
          // Other columns: try to parse as number
          const numValue = Number(stringValue)
          return [fieldName, isNaN(numValue) ? stringValue : numValue]
        }
      })

      // Create object from ordered pairs to preserve field order
      const finalObject = Object.fromEntries(orderedPairs)

      return finalObject
    })

    const rowCount = transformedData.length
    const message = dataType
      ? `Successfully processed ${rowCount} rows for ${dataType}`
      : `Successfully processed ${rowCount} rows`

    return {
      data: transformedData,
      fieldOrder: fieldNames, // Return the field order array
      message,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown parsing error"
    throw new Error(`XML parsing failed: ${errorMessage}`)
  }
}

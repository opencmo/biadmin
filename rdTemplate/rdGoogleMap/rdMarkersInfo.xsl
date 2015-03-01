	<xsl:for-each select="/*/rdDataID">
    <xsl:variable name="nPageRowCnt" select="0" />
    <xsl:variable name="nPageNr" select="1" />
    <SPAN style="display:none;" rdActionMapMarkerInfo="bActionMapMarkerInfo">
      <xsl:attribute name="id">
        <xsl:value-of select="concat('rdDataID_Row',position())"/>
      </xsl:attribute>
      rdMarkerText
      rdMarkerImage
      rdMarkerInfo
      rdMarkerAction
    </SPAN>
    </xsl:for-each>


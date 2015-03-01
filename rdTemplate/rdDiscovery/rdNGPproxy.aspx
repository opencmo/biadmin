<%@ Page Language="vb" Trace="False" EnableSessionState="ReadOnly" %>
<%
    Dim rdProxy As New rdServer.rdNGPproxy
    Call rdProxy.Page_Load()
%>

<head id="head1" runat="server" visible="false" />